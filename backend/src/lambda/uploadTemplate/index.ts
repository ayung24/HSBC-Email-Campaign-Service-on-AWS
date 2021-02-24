import { APIGatewayProxyEvent } from 'aws-lambda';
import { IUploadTemplateReqBody } from '../lambdaInterfaces';
import * as db from '../../database/dbOperations';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost, PresignedPost } from '@aws-sdk/s3-presigned-post';
import * as AWS from 'aws-sdk';
import {ITemplateFullEntry} from "../../database/dbInterfaces";

const HTML_BUCKET_NAME = process.env.HTML_BUCKET_NAME;
const PRESIGNED_URL_EXPIRY = process.env.PRESIGNED_URL_EXPIRY ? Number.parseInt(process.env.PRESIGNED_URL_EXPIRY) : undefined; // OPTIONAL
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
const validateEnv = function (): boolean {
    return !!HTML_BUCKET_NAME && !!ENCRYPTION_KEY_SECRET && !!SECRET_MANAGER_REGION;
};

/**
 * Creates a POST pre-signed URL client can directly use to access S3
 * @param key bucket key to put object in
 */
const getPresignedPost = async function (key: string): Promise<PresignedPost> {
    return createPresignedPost(s3, {
        Bucket: HTML_BUCKET_NAME!,
        Key: key,
        Conditions: [
            { acl: 'bucket-owner-full-control' },
            { bucket: HTML_BUCKET_NAME! },
            ['starts-with', '$key', key],
            // TODO: Restrict content type to zip files
            // ['starts-with', '$Content-Type', 'binary/octet-stream'], // only accept zip files
        ],
        Fields: {
            acl: 'bucket-owner-full-control',
        },
        Expires: PRESIGNED_URL_EXPIRY,
    }).catch(err => Promise.reject({ error: err, message: err.message }));
};

async function retrieveEncryptKey(): Promise<string> {
    // Create a Secrets Manager client
    const client = new AWS.SecretsManager({
        region: SECRET_MANAGER_REGION,
    });

    return new Promise((resolve, reject) => {
        client.getSecretValue({ SecretId: ENCRYPTION_KEY_SECRET! }, function (err: any, data: any) {
            // In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
            // See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
            // We rethrow the exception by default.
            if (err) {
                reject(err);
            } else {
                // Decrypts secret using the associated KMS CMK.
                // Depending on whether the secret is a string or binary, one of these fields will be populated.
                if ('SecretString' in data) {
                    resolve(data.SecretString);
                } else {
                    const buff = Buffer.from(data.SecretBinary, 'base64');
                    resolve(buff.toString('ascii'));
                }
            }
        });
    });
}

async function generateEncryptedApiKey(): Promise<{ encryptedUUID: string; apiKey: string }> {
    const uuidAPIKey = require('uuid-apikey');
    const Cryptr = require('cryptr');
    const { uuid, apiKey } = uuidAPIKey.create();

    // TODO #46: Add in key encryption
    // const key: string = await retrieveEncryptKey();
    // const cryptr = new Cryptr(key);
    // const encryptedUUID= cryptr.encrypt(uuid);

    return {
        encryptedUUID: uuid,
        apiKey: apiKey,
    };
}

// TODO #46: Add error codes to responses

export const handler = async function (event: APIGatewayProxyEvent) {
    if (!validateEnv()) {
        return {
            headers: headers,
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error',
                code: '',
            }),
        };
    } else if (!event.body) {
        return {
            headers: headers,
            statusCode: 400,
            body: JSON.stringify({
                message: 'Invalid request format',
                code: '',
            }),
        };
    }

    const req: IUploadTemplateReqBody = JSON.parse(event.body);

    const { encryptedUUID, apiKey } = await generateEncryptedApiKey();

    const addTemplate = db.AddTemplate(req.templateName, req.fieldNames, encryptedUUID);
    const createPostUrl = addTemplate.then((entry: ITemplateFullEntry) => getPresignedPost(entry.templateId));
    return Promise.all([addTemplate, createPostUrl])
        .then(([entry, postUrl]: [ITemplateFullEntry, PresignedPost]) => {
            return {
                headers: headers,
                statusCode: 200,
                body: JSON.stringify({
                    templateId: entry.templateId,
                    timeCreated: entry.timeCreated,
                    templateStatus: entry.templateStatus,
                    templateName: entry.templateName,
                    apiKey: entry.apiKey,
                    fieldNames: entry.fieldNames,
                    imageUploadUrl: postUrl,
                }),
            };
        })
        .catch(err => {
            console.log(`Error: ${err.error.stack}`);
            return {
                headers: headers,
                statusCode: 500,
                body: JSON.stringify({
                    message: err.message,
                    code: '',
                }),
            };
        });
};
