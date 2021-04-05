import { APIGatewayProxyEvent } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { ErrorCode, ErrorMessages, ESCError } from '../../ESCError';
import { ISendEmailReqBody } from '../lambdaInterfaces';
import * as Logger from '../../logger';
import { AWSError } from 'aws-sdk';
import { SendMessageResult, SendMessageRequest } from 'aws-sdk/clients/sqs';

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
const validateEnv = function (variables: Array<string | undefined>): boolean {
    return variables.some(v => !v);
};

const sendMessage: (params: SendMessageRequest) => Promise<string> = (params: SendMessageRequest) => {
    return new Promise((resolve, reject) => {
        sqs.sendMessage(params, (err: AWSError, res: SendMessageResult) => {
            if (err) {
                Logger.logError(err);
                const queueError = new ESCError(ErrorCode.ES17, `Send to queue error: ${JSON.stringify(params)}`);
                reject(queueError);
            } else {
                resolve(res.MessageId || '');
            }
        });
    });
};

/**
 * Queues incoming email batch requests to email queue
 * Assumes each email request has been validated to contain required fields
 * Promise always resolves with failed and processed counts
 */
export const handler = async function (event: APIGatewayProxyEvent) {
    const VERIFIED_EMAIL_ADDRESS = process.env.VERIFIED_EMAIL_ADDRESS;
    const EMAIL_QUEUE_URL = process.env.EMAIL_QUEUE_URL;

    Logger.logCURLInfo(event);
    if (!validateEnv([VERIFIED_EMAIL_ADDRESS, EMAIL_QUEUE_URL])) {
        return {
            headers: headers,
            statusCode: 500,
            body: JSON.stringify({
                message: ErrorMessages.INTERNAL_SERVER_ERROR,
                code: ErrorCode.ES16,
            }),
        };
    } else if (!event.queryStringParameters || !event.queryStringParameters.templateid || !event.body) {
        return {
            headers: headers,
            statusCode: 400,
            body: JSON.stringify({
                message: ErrorMessages.INVALID_REQUEST_FORMAT,
                code: ErrorCode.ES18,
            }),
        };
    }

    const templateId: string = event.queryStringParameters.templateid;
    const emails: ISendEmailReqBody[] = JSON.parse(event.body);

    const queuePromises: Promise<string>[] = emails.map(email => {
        const params = {
            MessageBody: JSON.stringify({
                templateId: templateId,
                subject: email.subject,
                from: VERIFIED_EMAIL_ADDRESS,
                to: email.recipient,
                fields: email.fields,
            }),
            QueueUrl: EMAIL_QUEUE_URL!,
            MessageGroupId: '0',
        };
        return sendMessage(params);
    });

    return Promise.allSettled(queuePromises).then((results: PromiseSettledResult<string>[]) => {
        const fulfilled = results.filter(res => res.status == 'fulfilled');
        const failed = results.filter(res => res.status == 'rejected');
        return {
            headers: headers,
            statusCode: 200,
            body: JSON.stringify({
                processed: fulfilled.length,
                failed: failed.length,
            }),
        };
    });
};
