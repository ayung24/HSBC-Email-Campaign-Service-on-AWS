import { APIGatewayProxyEvent } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { ISendEmailFields, ISendEmailReqBody } from '../lambdaInterfaces';
import * as db from '../../database/dbOperations';
import { ITemplateFullEntry } from '../../database/dbInterfaces';
import { ErrorCode, ErrorMessages, ESCError } from '../../ESCError';
import * as Logger from '../../logger';
import { AWSError } from 'aws-sdk';
import { SendMessageResult } from 'aws-sdk/clients/sqs';

const SQS_VERSION = process.env.SQS_VERSION || '2012-11-15';

const headers = {
    'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    'Content-Type': 'application/json',
};

const sqs = new AWS.SQS({ apiVersion: SQS_VERSION });

/**
 * Validates lambda's runtime env variables
 */
export const validateEnv = function (variables: Array<string | undefined>): boolean {
    return !variables.some(v => !v);
};

/**
 * @param fields dynamic field values
 * @param fieldNames required dynamic fields
 * @returns false if missing required fields, otherwise true
 */
const checkFields = function (fields: ISendEmailFields, fieldNames: string[]): boolean {
    const keys = Object.keys(fields);
    return fieldNames.every(field => keys.includes(field));
};

export const sendMessage = function (params: { MessageBody: string; QueueUrl: string; MessageGroupId: string }) {
    return new Promise((resolve, reject) => {
        sqs.sendMessage(params, (err: AWSError, data: SendMessageResult) => {
            if (err) {
                Logger.logError(err);
                const queueError = new ESCError(ErrorCode.ES12, `Send to queue error: ${JSON.stringify(params)}`);
                reject(queueError);
            } else {
                resolve(data.MessageId!);
            }
        });
    });
};

export const handler = async function (event: APIGatewayProxyEvent) {
    const METADATA_TABLE_NAME = process.env.METADATA_TABLE_NAME;
    const HTML_BUCKET_NAME = process.env.HTML_BUCKET_NAME;
    const PROCESSED_HTML_PATH = process.env.PROCESSED_HTML_PATH;
    const VERIFIED_EMAIL_ADDRESS = process.env.VERIFIED_EMAIL_ADDRESS;
    const EMAIL_QUEUE_URL = process.env.EMAIL_QUEUE_URL;
    const envList: Array<string | undefined> = [
        METADATA_TABLE_NAME,
        HTML_BUCKET_NAME,
        PROCESSED_HTML_PATH,
        VERIFIED_EMAIL_ADDRESS,
        EMAIL_QUEUE_URL,
    ];

    Logger.logCURLInfo(event);
    if (!validateEnv(envList)) {
        return {
            headers: headers,
            statusCode: 500,
            body: JSON.stringify({
                message: ErrorMessages.INTERNAL_SERVER_ERROR,
                code: ErrorCode.ES0,
            }),
        };
    } else if (!event.queryStringParameters || !event.queryStringParameters.templateid || !event.body) {
        return {
            headers: headers,
            statusCode: 400,
            body: JSON.stringify({
                message: ErrorMessages.INVALID_REQUEST_FORMAT,
                code: ErrorCode.ES1,
            }),
        };
    }

    const templateId: string = event.queryStringParameters.templateid;
    const req: ISendEmailReqBody = JSON.parse(event.body);

    // Check email is valid https://regexr.com/3e48o
    const REGEX = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!REGEX.test(req.recipient)) {
        return {
            headers: headers,
            statusCode: 400,
            body: JSON.stringify({
                message: `Recipient email address is not a valid email.`,
                code: ErrorCode.ES11,
            }),
        };
    }

    return db
        .GetTemplateById(templateId)
        .then((metadata: ITemplateFullEntry) => {
            const validFields: boolean = checkFields(req.fields, metadata.fieldNames);
            if (!validFields) {
                const missingFieldsError = new ESCError(
                    ErrorCode.ES2,
                    `Missing required dynamic fields for template ${metadata.templateId}`,
                    true,
                );
                Logger.logError(missingFieldsError);
                return Promise.reject(missingFieldsError);
            }
            const params = {
                MessageBody: JSON.stringify({
                    templateId: templateId,
                    subject: req.subject,
                    from: VERIFIED_EMAIL_ADDRESS,
                    to: req.recipient,
                    fields: req.fields,
                }),
                QueueUrl: EMAIL_QUEUE_URL!,
                MessageGroupId: '0', // id does not matter since we're not grouping
            };
            return sendMessage(params);
        })
        .then(messageId => {
            return {
                headers: headers,
                statusCode: 200,
                body: JSON.stringify({
                    templateId: templateId,
                    sender: VERIFIED_EMAIL_ADDRESS,
                    recipient: req.recipient,
                    queueMessageId: messageId,
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
                code = ErrorCode.ES13;
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
