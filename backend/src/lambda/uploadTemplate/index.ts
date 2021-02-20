import { APIGatewayProxyEvent } from 'aws-lambda';
import { IUploadTemplateReqBody } from '../types';
import * as db from '../../database/dbOperations';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost, PresignedPost } from '@aws-sdk/s3-presigned-post';
import { IDetailedEntry } from '../../database/interfaces';
import * as AWS from 'aws-sdk';

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const PRESIGNED_URL_EXPIRY = process.env.PRESIGNED_URL_EXPIRY;  // OPTIONAL
const ENCRYPTION_KEY_SECRET = process.env.ENCRYPTION_KEY_SECRET;
const SECRET_MANAGER_REGION = process.env.SECRET_MANAGER_REGION;

const headers = {
    'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    'Content-Type': 'application/json',
};
const s3 = new S3Client({});

/**
 * Validates lambda's runtime env variables
 */
const validateEnv = function(): boolean {
    return !!S3_BUCKET_NAME &&
    !!ENCRYPTION_KEY_SECRET &&
    !!SECRET_MANAGER_REGION;
}

/**
 * Creates a POST pre-signed URL client can directly use to access S3
 * @param key bucket key to put object in
 */
const getPresignedPost = async function (key: string): Promise<PresignedPost> {
    return createPresignedPost(s3, {
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Conditions: [
            { acl: 'bucket-owner-full-control' },
            { bucket: S3_BUCKET_NAME },
            ['starts-with', '$key', key],
            ['starts-with', '$Content-Type', 'application/zip'], // only accept zip files
        ],
        Fields: {
            acl: 'bucket-owner-full-control',
        },
        Expires: PRESIGNED_URL_EXPIRY ? null : Number.parseInt(PRESIGNED_URL_EXPIRY),
    });
};

/**
 * Parses given html string and outputs dynamic field names in an array
 * @param html html containing dynamic fields as ${...}
 */
const parseDynamicFields = function (html: string): string[] {
    let regex = new RegExp(/\${(.*?)}/gm);
    let matches = regex.exec(html);
    let fields = [];
    while (matches) {
        fields.push(matches[1])
        matches = regex.exec(html);
    }
    return fields;
}

async function retrieveEncryptKey(): Promise<string> {
    // Create a Secrets Manager client
    const client = new AWS.SecretsManager({
        region: SECRET_MANAGER_REGION
    });

    return new Promise((resolve,reject) => {
        client.getSecretValue({SecretId: ENCRYPTION_KEY_SECRET}, function(err: any, data: any) {

            // In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
            // See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
            // We rethrow the exception by default.
            if (err) {
                reject(err);
            }
            else {
                // Decrypts secret using the associated KMS CMK.
                // Depending on whether the secret is a string or binary, one of these fields will be populated.
                if ('SecretString' in data) {
                    resolve(data.SecretString);
                } else {
                    let buff = Buffer.from(data.SecretBinary, 'base64');
                    resolve(buff.toString('ascii'));
                }
            }
        });
    });
}

async function generateEncryptedApiKey(): Promise<{encryptedUUID, apiKey}> {
    const uuidAPIKey = require('uuid-apikey');
    const Cryptr = require('cryptr');
    const {uuid, apiKey} = uuidAPIKey.create();

    // TODO: Add in key encryption
    // const key: string = await retrieveEncryptKey();
    // const cryptr = new Cryptr(key);
    // const encryptedUUID= cryptr.encrypt(uuid);

    return {
        encryptedUUID: uuid,
        apiKey: apiKey
    };
}

export const handler = async function (event: APIGatewayProxyEvent) {

    if (!validateEnv()) {
        return {
            headers,
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal server error",
                code: ""
            })
        }
    } else if (!event.body) {
        return {
            headers,
            statusCode: 400,
            body: JSON.stringify({
                message: "Invalid request format",
                code: ""
            })
        }
    }
    
    const req: IUploadTemplateReqBody = JSON.parse(event.body);

    const {encryptedUUID, apiKey} = await generateEncryptedApiKey();
    
    const addTemplate = db.AddTemplate(req.name, req.html, parseDynamicFields(req.html), encryptedUUID);
    const createPostUrl = addTemplate.then((entry: IDetailedEntry) => getPresignedPost(entry.templateId));
    return Promise.all([addTemplate, createPostUrl]).then(([entry, postUrl]: [IDetailedEntry, PresignedPost]) => {
        return {
            headers,
            statusCode: 200,
            body: JSON.stringify({
                "templateId": entry.templateId,
                "name": entry.name,
                "timeCreated": entry.timeCreated,
                "imageUploadUrl": postUrl
            }),
        }
    }).catch(err => {
        return {
            headers,
            statusCode: 500,
            body: JSON.stringify({
                message: err.message,
                code: ""
            })
        }
    })
}
