import { APIGatewayProxyEvent } from 'aws-lambda';
import { IUploadTemplateReqBody } from '../types';
import * as db from '../../database/dbOperations';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost, PresignedPost } from '@aws-sdk/s3-presigned-post';
import { config } from '../../../lib/config';
import { v4 as uuid } from 'uuid';

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || '';
const PRESIGNED_URL_EXPIRY = process.env.PRESIGNED_URL_EXPIRY || null;

const headers = {
    'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    'Content-Type': 'application/json',
};

/**
 * Creates a POST pre-signed URL client can directly use to access S3
 * @param key bucket key to put object in
 */
const getPresignedPost = async function (key: string): Promise<PresignedPost> {
    const s3 = new S3Client({});
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

async function mySecrets(): Promise<string> {
    // Load the AWS SDK
    const AWS = require('aws-sdk'),
    secretName = config.secretsManager.SECRET_NAME;

    // Create a Secrets Manager client
    const client = new AWS.SecretsManager({
        region: config.secretsManager.REGION
    });

    return new Promise((resolve,reject) => {
        client.getSecretValue({SecretId: secretName}, function(err: any, data: any) {

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
                    let buff = new Buffer(data.SecretBinary, 'base64');
                    resolve(buff.toString('ascii'));
                }
            }
        });
    });
}

async function generateEncryptedApiKey(): Promise<string> {
    const uuidAPIKey = require('uuid-apikey');
    const Cryptr = require('cryptr');

    const apiKeyUuid: string = uuid();
    const apiKey: string = uuidAPIKey.toAPIKey(apiKeyUuid);

    const secretValue: string = await mySecrets();
    const cryptr = new Cryptr(secretValue);
    const encryptedApiKey: string = cryptr.encrypt(apiKey);

    return encryptedApiKey;
}

export const handler = async function (event: APIGatewayProxyEvent) {
    // const user = event.headers['Authorization'];
    // console.log(user);
    if (!event.body) {
        return {
            headers,
            statusCode: 400,
            body: JSON.stringify({
                "message": "Invalid request format",
                "code": ""
            })
        }
    }
    
    const req: IUploadTemplateReqBody = JSON.parse(event.body);
    
    // 1. validate name
    const nameExists = (await db.GetMetadataByName(req.name)).status.succeeded;
    if (nameExists) {
        return {
            headers,
            statusCode: 400,
            body: JSON.stringify({
                "message": `Duplicate template name: ${req.name}`,
                "code": ""
            })
        }
    }

    // 2. generate & encrypt API key
    const encryptedApiKey: string = await generateEncryptedApiKey();

    // 3. store metadata to DynamoDB
    const {status, metadata} =  await db.AddMetadataEntry(req.name)
    if (!status.succeeded || !metadata) {
        return {
            headers,
            statusCode: 500,
            body: JSON.stringify({
                "message": `Failed to upload template: ${status.info}`,
                "code": ""
            })
        }
    }
    
    // 4. store HTML to DynamoDB
    const addHtml = (await db.AddHTMLEntry({
        html: req.html,
        fieldNames: parseDynamicFields(req.html),
        apiKey: '',
        templateID: metadata.templateID
    })).status
    if (!addHtml.succeeded) {
        // error
    }

    // 5. get S3 pre-signed URL
    const presignedPost = await getPresignedPost(req.name); // TODO #9: Change to template ID
    return {
        headers,
        statusCode: 200,
        body: JSON.stringify({
            "templateID": metadata.templateID,
            "name": metadata.name,
            "timeCreated": metadata.timeCreated,
            "imageUpload": presignedPost}),
    }
}
