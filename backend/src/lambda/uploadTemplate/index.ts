import { APIGatewayProxyEvent } from 'aws-lambda';
import { IUploadTemplateReqBody } from '../lambdaInterfaces';
import * as db from '../../database/dbOperations';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost, PresignedPost } from '@aws-sdk/s3-presigned-post';
import * as AWS from 'aws-sdk';
import { ITemplateFullEntry } from '../../database/dbInterfaces';
import { ErrorCode } from '../../errorCode';

const HTML_BUCKET_NAME = process.env.HTML_BUCKET_NAME;
const METADATA_TABLE_NAME = process.env.METADATA_TABLE_NAME;
const PRESIGNED_URL_EXPIRY = process.env.PRESIGNED_URL_EXPIRY ? Number.parseInt(process.env.PRESIGNED_URL_EXPIRY) : undefined; // OPTIONAL
const ENCRYPTION_KEY_SECRET = process.env.ENCRYPTION_KEY_SECRET;
const SECRET_MANAGER_REGION = process.env.SECRET_MANAGER_REGION;

const headers = {
    'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    'Content-Type': 'application/json',
};
const s3 = new S3Client({});
const secretManager: AWS.SecretsManager = new AWS.SecretsManager({
    region: SECRET_MANAGER_REGION,
});

/**
 * Validates lambda's runtime env variables
 */
const validateEnv = function (): boolean {
    return !!METADATA_TABLE_NAME && !!HTML_BUCKET_NAME && !!ENCRYPTION_KEY_SECRET && !!SECRET_MANAGER_REGION;
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
            ['starts-with', '$Content-Type', 'text/html'],
            ['content-length-range', 1, 4000000], // 1byte - 4MB
        ],
        Fields: {
            bucket: HTML_BUCKET_NAME!,
            acl: 'bucket-owner-full-control',
            'Content-Type': 'text/html; charset=UTF-8',
        },
        Expires: PRESIGNED_URL_EXPIRY,
    });
};

async function retrieveEncryptKey(): Promise<string> {
    return new Promise((resolve, reject) => {
        secretManager.getSecretValue(
            { SecretId: ENCRYPTION_KEY_SECRET! },
            (err: AWS.AWSError, data: AWS.SecretsManager.GetSecretValueResponse) => {
                if (err) {
                    reject(err);
                } else {
                    if (data.SecretString) {
                        resolve(data.SecretString);
                    } else {
                        reject(new Error('Encryption key was not found'));
                    }
                }
            },
        );
    });
}

async function generateEncryptedApiKey(): Promise<string> {
    console.info('Generating encrypted API key');
    const uuidAPIKey = require('uuid-apikey');
    const Cryptr = require('cryptr');
    const { _, apiKey } = uuidAPIKey.create();

    // return retrieveEncryptKey().then(key => {
    //     console.info("Retrieved encryption key")
    //     const cryptr = new Cryptr(key);
    //     return cryptr.encrypt(apiKey);
    // })

    // TODO: Support cross-account encryption key retrieval
    const cryptr = new Cryptr('my-secret-key-that-is-not-too-secret');
    return cryptr.encrypt(apiKey);
}

export const handler = async function (event: APIGatewayProxyEvent) {
    if (!validateEnv()) {
        return {
            headers: headers,
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error',
                code: ErrorCode.TS0,
            }),
        };
    } else if (!event.body) {
        return {
            headers: headers,
            statusCode: 400,
            body: JSON.stringify({
                message: 'Invalid request format',
                code: ErrorCode.TS1,
            }),
        };
    }

    const req: IUploadTemplateReqBody = JSON.parse(event.body);

    const addTemplate = generateEncryptedApiKey().then((encryptedApiKey: string) =>
        db.AddTemplate(req.templateName, req.fieldNames, encryptedApiKey),
    );
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
            console.log(`Error: ${err.message}`);
            return {
                headers: headers,
                statusCode: 500,
                body: JSON.stringify({
                    message: err.message,
                    code: ErrorCode.TS2,
                }),
            };
        });
};
