import { SQSEvent, SQSRecord } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { createTransport, SentMessageInfo } from 'nodemailer';
import { ISendEmailFields, IEmailQueueBody } from '../lambdaInterfaces';
import * as db from '../../database/dbOperations';
import { ErrorCode, ErrorMessages, ESCError } from '../../ESCError';
import { nonEmptyArray } from '../../commonFunctions';
import * as Logger from '../../logger';
import { SendMessageResult } from 'aws-sdk/clients/sqs';

const SES_VERSION = process.env.SES_VERSION || '2010-12-01';
const SQS_VERSION = process.env.SQS_VERSION || '2012-11-05';
const HTML_BUCKET_NAME = process.env.HTML_BUCKET_NAME;
const PROCESSED_HTML_PATH = process.env.PROCESSED_HTML_PATH;
const EMAIL_QUEUE_URL = process.env.EMAIL_QUEUE_URL;
const EMAIL_DLQ_URL = process.env.EMAIL_DLQ_URL;
const MAX_SEND_RATE = process.env.MAX_SEND_RATE;

const sqs = new AWS.SQS({
    apiVersion: SQS_VERSION,
});

const ses = new AWS.SES({
    apiVersion: SES_VERSION,
});

const transporter = createTransport({
    SES: ses,
});

/**
 * Validates lambda's runtime env variables
 */
const validateEnv = function (): boolean {
    return !!HTML_BUCKET_NAME && !!PROCESSED_HTML_PATH && !!EMAIL_QUEUE_URL && !!EMAIL_DLQ_URL && !!MAX_SEND_RATE;
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

/**
 * If HTML for templateId exists in cache, use cached HTML, otherwise retrive from database
 * @param templateId to retrive HTML for
 * @param htmlCache with cached templateId to html string
 */
const getHTML = function (templateId: string, htmlCache: Map<string, string>): Promise<string> {
    if (htmlCache.has(templateId)) {
        return Promise.resolve(htmlCache.get(templateId)!);
    } else {
        return db.GetHTMLById(templateId, PROCESSED_HTML_PATH!).then(html => {
            htmlCache.set(templateId, html);
            return Promise.resolve(html);
        });
    }
};

/**
 * Given record with send body, invoke SES send and delete message off the email queue if successful.
 * Promise reject if sending unsuccessful.
 * @param record
 * @param htmlCache with cached templateId to html string
 */
const sendEmail = function (record: SQSRecord, htmlCache: Map<string, string>): Promise<SentMessageInfo> {
    const body: IEmailQueueBody = JSON.parse(record.body);

    Logger.info({ message: 'Sending email for record', additionalInfo: record });

    return getHTML(body.templateId, htmlCache)
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
                let sendMailError;
                if (err.statusCode === 400 && err.message == 'Throttling') {
                    sendMailError = new ESCError(ErrorCode.ES10, `Send email throttled for record ${record.messageId}`);
                } else if (err.statusCode < 500) {
                    sendMailError = new ESCError(ErrorCode.ES5, JSON.stringify(record), true);
                } else {
                    sendMailError = new ESCError(ErrorCode.ES11, `Internal send email error for record ${record.messageId}`);
                }
                return Promise.reject(sendMailError);
            });
        })
        .then((info: SentMessageInfo) => {
            // dequeue sent email manually from email queue
            Logger.info({ message: 'Email sent successfully for record', additionalInfo: record.messageId });
            const params = {
                QueueUrl: EMAIL_QUEUE_URL!,
                ReceiptHandle: record.receiptHandle,
            };
            return new Promise(resolve => {
                sqs.deleteMessage(params, (err: AWS.AWSError, data) => {
                    // in case dequeue fails, we will just log it, email send succeeded regardless
                    if (err) {
                        Logger.logError(err);
                    } else {
                        Logger.info({ message: 'Delete record from email queue', additionalInfo: record.messageId });
                    }
                    resolve(info);
                });
            });
        });
};

/**
 * Handles error depending on error type (user/non-user error).
 * User errors are non-retriable, and the record gets moved to DLQ to avoid further retries.
 * Non-user errors are unhandled to let SQS's retry process invoke this lambda again
 * @param err
 */
const handleError = function (err: Error) {
    if (err instanceof ESCError && err.isUserError) {
        Logger.info({ message: 'Handle non-retriable send', additionalInfo: err.message });
        const record: SQSRecord = JSON.parse(err.message);
        const params = {
            QueueUrl: EMAIL_DLQ_URL!,
            MessageBody: err.message,
            MessageGroupId: '0', // id doesn't matter, we are not grouping records
        };
        return sqs
            .sendMessage(params)
            .promise()
            .then((data: SendMessageResult) => {
                Logger.info({ message: 'Sent to DLQ', additionalInfo: data });
                const deleteParams = {
                    QueueUrl: EMAIL_QUEUE_URL!,
                    ReceiptHandle: record.receiptHandle,
                };
                return sqs.deleteMessage(deleteParams).promise();
            })
            .catch((err: AWS.AWSError) => {
                // queue operation failed, we will just log it, at worst case, this record gets processed again
                Logger.logError(err);
                return Promise.resolve();
            });
    } else {
        // non-user errors are retriable
        return Promise.resolve();
    }
};

/**
 * Timeout for t seconds
 * @param t delay seconds
 */
const delay = (t: number) => new Promise(resolve => setTimeout(resolve, t));

export const handler = async function (event: SQSEvent) {
    Logger.info({ message: 'Received SQS event', additionalInfo: event });
    if (!validateEnv()) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: ErrorMessages.INTERNAL_SERVER_ERROR,
                code: ErrorCode.ES14,
            }),
        };
    } else if (nonEmptyArray(event.Records)) {
        // We cache htmls for duration of this lambda invocation
        const htmlCache = new Map<string, string>();

        const sendPromises: (() => Promise<SentMessageInfo>)[] = event.Records.map(record => () => sendEmail(record, htmlCache));
        const sent: SentMessageInfo[] = [];
        const chainedSend: Promise<SentMessageInfo> = sendPromises.slice(1).reduce((chain, nextSend) => {
            return chain
                .then(info => {
                    sent.push(info);
                    return delay(1000 / parseInt(MAX_SEND_RATE!, 10)).then(() => nextSend());
                })
                .catch(err => {
                    return handleError(err).then(() => nextSend());
                });
        }, sendPromises[0]());

        return chainedSend
            .then(info => sent.push(info))
            .catch(err => handleError(err))
            .finally(() => {
                if (sent.length < event.Records.length) {
                    // at least one record failed to be sent,
                    // return error to keep failed messages on email queue
                    const batchError = new ESCError(ErrorCode.ES15, `Partial batch failure: ${sent.length}/${event.Records.length} sent`);
                    Logger.logError(batchError);
                    return {
                        statusCode: batchError.getStatusCode(),
                        body: JSON.stringify({
                            message: batchError.message,
                            code: batchError.code,
                        }),
                    };
                } else {
                    Logger.info({ message: `Sent ${sent.length} emails`, additionalInfo: sent.map(info => info.messageId) });
                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            messageIds: sent.map(info => info.messageId),
                        }),
                    };
                }
            });
    } else {
        Logger.info({ message: 'No record received in batch' });
        return {
            statusCode: 200,
            body: JSON.stringify({
                messageIds: [],
            }),
        };
    }
};
