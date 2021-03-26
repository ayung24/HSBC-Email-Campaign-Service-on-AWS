import { SQSEvent, SQSRecord } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { createTransport, SentMessageInfo } from 'nodemailer';
import { ISendEmailFields, IEmailQueueBody } from '../lambdaInterfaces';
import * as db from '../../database/dbOperations';
import { ErrorCode, ErrorMessages, ESCError } from '../../ESCError';
import { nonEmptyArray } from '../../commonFunctions'
import * as Logger from '../../../logger';

const SES_VERSION = process.env.SES_VERSION || '2010-12-01';
const SQS_VERSION = process.env.SQS_VERSION || '2012-11-05';
const HTML_BUCKET_NAME = process.env.HTML_BUCKET_NAME;
const PROCESSED_HTML_PATH = process.env.PROCESSED_HTML_PATH;
const EMAIL_QUEUE_URL = process.env.EMAIL_QUEUE_URL;
const MAX_SEND_RATE = process.env.MAX_SEND_RATE;

const sqs = new AWS.SQS({
    apiVersion: SQS_VERSION,
});

const ses = new AWS.SES({
    apiVersion: SES_VERSION,
});

const transporter = createTransport({
    SES: ses,
    maxConnections: 1,
    sendingRate: parseInt(MAX_SEND_RATE),
});

const headers = {
    'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    'Content-Type': 'application/json',
};

/**
 * Validates lambda's runtime env variables
 */
const validateEnv = function (): boolean {
    return !!HTML_BUCKET_NAME && !!PROCESSED_HTML_PATH && !!EMAIL_QUEUE_URL && !!MAX_SEND_RATE;
};

/**
 * @param srcHTML HTML with dynamic fields
 * @param fields dynamic field values
 * @returns HTML with dynamic fields replaced with their values, or null if missing required fields
 */
const replaceFields = function (srcHTML: string, fields: ISendEmailFields): string {
    const fieldNames = Object.keys(fields);
    const regex = new RegExp('\\${(' + fieldNames.join('|') + ')}', 'g');
    const html = srcHTML.replace(regex, (_, field) => {
        return fields[field];
    });
    return html;
};

const sendEmail = function(record: SQSRecord): Promise<SentMessageInfo> {
    const body: IEmailQueueBody = JSON.parse(record.body);
    Logger.info({message: 'Sending email for SQS record', additionalInfo: record});
    return db.GetHTMLById(body.templateId, PROCESSED_HTML_PATH)
    .then(srcHTML => {
        const html: string = replaceFields(srcHTML, body.fields);
        const params = {
            from: body.from,
            to: body.to,
            subject: body.subject,
            html: html,
        };
        return transporter.sendMail(params).catch(err => {
            Logger.logError(err);
            const sendMailError = new ESCError(ErrorCode.ES5, `Send email error for SQS record ${record.messageId}`);
            return Promise.reject(sendMailError);
        })
    }).then((info: SentMessageInfo) => {
        // dequeue sent email manually from email queue
        const params = {
            QueueUrl: EMAIL_QUEUE_URL,
            ReceiptHandle: record.receiptHandle
        }
        return new Promise((resolve) => 
            sqs.deleteMessage(params, (err: AWS.AWSError, data: {}) => {
                // in case dequeue fails, we will just log it, email send succeeded regardless
                if (err) {
                    Logger.logError(err);
                }
                resolve(info);
            })
        );
    })
}

export const handler = async function (event: SQSEvent) {
    Logger.info({message: "Received SQS event", additionalInfo: event });
    if (!validateEnv()) {
        return {
            headers: headers,
            statusCode: 500,
            body: JSON.stringify({
                message: ErrorMessages.INTERNAL_SERVER_ERROR,
                code: ErrorCode.ES8,
            }),
        };
    } else if (nonEmptyArray(event.Records)) {
        let sendPromises: (() => Promise<SentMessageInfo>)[] = event.Records.map((record) => () => sendEmail(record));
        let sent: SentMessageInfo[] = [];
        const chainedSend: Promise<SentMessageInfo> = sendPromises.slice(1).reduce((chain, nextSend) => {
            return chain.then(info => {
                console.log("next")
                sent.push(info);
                return nextSend();
            }).catch(err => {
                // ignore and proceed to next send
                console.error("failed");
                return nextSend();
            })
        }, sendPromises[0]());
        return chainedSend.then(info => {
            sent.push(info);
            Logger.info({message: `Sent ${sent.length} emails`, additionalInfo: sent})
            return {
                headers: headers,
                statusCode: 200,
                body: JSON.stringify({
                    messageIds: sent.map(info => info.messageId)
                })
            }
        }).finally(() => {
            if (sent.length < event.Records.length) {
                // at least one record failed to be sent,
                // throw an error to keep failed messages on email queue
                const batchError = new ESCError(ErrorCode.ES9, `Partial batch failure: ${sent.length}/${event.Records.length} sent`)
                Logger.logError(batchError);
                return {
                    headers: headers,
                    statusCode: batchError.getStatusCode(),
                    body: JSON.stringify({
                        message: batchError.message,
                        code: batchError.code,
                    })
                }
            }
        });
    } else {
        Logger.info({message: "No record received in batch"})
        return {
            headers: headers,
            statusCode: 200,
            body: JSON.stringify({
                messageIds: []
            })
        }
    }
};
