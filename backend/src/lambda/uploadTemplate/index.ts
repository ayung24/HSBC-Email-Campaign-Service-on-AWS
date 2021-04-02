import { APIGatewayProxyEvent } from 'aws-lambda';
import { IUploadTemplateReqBody } from '../lambdaInterfaces';
import * as db from '../../database/dbOperations';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost, PresignedPost } from '@aws-sdk/s3-presigned-post';
import * as AWS from 'aws-sdk';
import { AWSError, KMS } from 'aws-sdk';
import { ITemplateFullEntry } from '../../database/dbInterfaces';
import { ErrorCode, ErrorMessages, ESCError } from '../../ESCError';
import * as Logger from '../../logger';

const HTML_BUCKET_NAME = process.env.HTML_BUCKET_NAME;
const SRC_HTML_PATH = process.env.SRC_HTML_PATH;
const METADATA_TABLE_NAME = process.env.METADATA_TABLE_NAME;
const PRESIGNED_URL_EXPIRY = process.env.PRESIGNED_URL_EXPIRY ? Number.parseInt(process.env.PRESIGNED_URL_EXPIRY) : undefined; // OPTIONAL
const KMS_REGION = process.env.KMS_REGION;
const KMS_ACCOUNT_ID = process.env.KMS_ACCOUNT_ID;
const KMS_KEY_ID = process.env.KMS_KEY_ID;

const headers = {
    'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    'Content-Type': 'application/json',
};
const s3 = new S3Client({});

const kmsClient: AWS.KMS = new AWS.KMS({
    region: KMS_REGION,
});

/**
 * Validates lambda's runtime env variables
 */
const validateEnv = function (): boolean {
    return !!METADATA_TABLE_NAME && !!HTML_BUCKET_NAME && !!SRC_HTML_PATH && !!KMS_KEY_ID && !!KMS_REGION && !!KMS_ACCOUNT_ID;
};

/**
 * Creates a POST pre-signed URL client can directly use to access S3
 * @param key bucket key to put object in
 */
const getPresignedPost = async function (key: string): Promise<PresignedPost> {
    Logger.info({ message: 'Creating presigned POST', additionalInfo: undefined });
    return createPresignedPost(s3, {
        Bucket: HTML_BUCKET_NAME!,
        Key: SRC_HTML_PATH + key,
        Conditions: [
            { acl: 'bucket-owner-full-control' },
            { bucket: HTML_BUCKET_NAME! },
            ['starts-with', '$key', SRC_HTML_PATH + key],
            ['starts-with', '$Content-Type', 'text/html'],
            ['content-length-range', 1, 4000000], // 1byte - 4MB
        ],
        Fields: {
            bucket: HTML_BUCKET_NAME!,
            acl: 'bucket-owner-full-control',
            'Content-Type': 'text/html; charset=UTF-8',
        },
        Expires: PRESIGNED_URL_EXPIRY,
    }).catch(err => {
        Logger.logError(err);
        const presignedPostError = new ESCError(ErrorCode.TS3, `Get presigned POST error`);
        return Promise.reject(presignedPostError);
    });
};

async function generateEncryptedApiKey(): Promise<string> {
    Logger.info({ message: 'Generating encrypted API key', additionalInfo: undefined });
    const uuidAPIKey = require('uuid-apikey');
    const { _, apiKey } = uuidAPIKey.create();

    const params = {
        KeyId: `arn:aws:kms:${KMS_REGION}:${KMS_ACCOUNT_ID}:key/${KMS_KEY_ID}`,
        Plaintext: Buffer.from(apiKey),
    };

    return new Promise((resolve, reject) => {
        kmsClient.encrypt(params, (err: AWSError, data: KMS.Types.EncryptResponse) => {
            if (err || !data.CiphertextBlob) {
                Logger.logError(err);
                const encryptError = new ESCError(ErrorCode.TS14, 'API key encryption failed');
                reject(encryptError);
            } else {
                const encryptedBase64data = Buffer.from(data.CiphertextBlob).toString('base64');
                resolve(encryptedBase64data);
            }
        });
    });
}

export const handler = async function (event: APIGatewayProxyEvent) {
    Logger.logRequestInfo(event);
    if (!validateEnv()) {
        return {
            headers: headers,
            statusCode: 500,
            body: JSON.stringify({
                message: ErrorMessages.INTERNAL_SERVER_ERROR,
                code: ErrorCode.TS0,
            }),
        };
    } else if (!event.body) {
        return {
            headers: headers,
            statusCode: 400,
            body: JSON.stringify({
                message: ErrorMessages.INVALID_REQUEST_FORMAT,
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
            Logger.info({ message: 'Upload template SUCCESS', additionalInfo: entry });
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
            let statusCode: number;
            let message: string;
            let code: string;
            if (err instanceof ESCError) {
                statusCode = err.getStatusCode();
                message = err.isUserError ? err.message : ErrorMessages.INTERNAL_SERVER_ERROR;
                code = err.code;
            } else {
                statusCode = 500;
                message = ErrorMessages.INTERNAL_SERVER_ERROR;
                code = ErrorCode.TS33;
            }
            return {
                headers: headers,
                statusCode: statusCode,
                body: JSON.stringify({
                    message: message,
                    code: code,
                }),
            };
        });
};
