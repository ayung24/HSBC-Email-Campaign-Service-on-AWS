import { APIGatewayProxyEvent } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { createTransport, SentMessageInfo } from 'nodemailer';
import { ISendEmailReqBody } from '../lambdaInterfaces';
import * as db from '../../database/dbOperations';
import { ITemplateFullEntry } from '../../database/dbInterfaces';
import { ErrorCode } from '../../errorCode';
import { replaceFields, processImages } from './processHtml';

const VERIFIED_EMAIL_ADDRESS = process.env.VERIFIED_EMAIL_ADDRESS;
const VERSION = process.env.VERSION || '2010-12-01';
const HTML_BUCKET_NAME = process.env.HTML_BUCKET_NAME;
const METADATA_TABLE_NAME = process.env.METADATA_TABLE_NAME;

const ses = new AWS.SES({
    apiVersion: VERSION,
});

const transporter = createTransport({
    SES: ses,
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
    return !!HTML_BUCKET_NAME && !!METADATA_TABLE_NAME && !!VERIFIED_EMAIL_ADDRESS;
};

export const handler = async function (event: APIGatewayProxyEvent) {
    if (!validateEnv()) {
        return {
            headers: headers,
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error',
                code: ErrorCode.ES0,
            }),
        };
    } else if (!event.body) {
        return {
            headers: headers,
            statusCode: 400,
            body: JSON.stringify({
                message: 'Invalid request format',
                code: ErrorCode.ES1,
            }),
        };
    }

    const req: ISendEmailReqBody = JSON.parse(event.body);
    return Promise.all([db.GetTemplateById(req.templateId), db.GetHTMLById(req.templateId)])
        .then(([metadata, srcHTML]: [ITemplateFullEntry, string]) => {
            const html: string | undefined = replaceFields(srcHTML, req.fields, metadata.fieldNames);
            if (!html) {
                return Promise.reject(new Error('Missing required dynamic fields'));
            }
            const processed = processImages(html);
            const params = {
                from: VERIFIED_EMAIL_ADDRESS,
                to: VERIFIED_EMAIL_ADDRESS,
                subject: req.subject,
                html: processed.html,
                attachments: processed.attachments,
            };
            return transporter.sendMail(params);
        })
        .then((res: SentMessageInfo) => {
            return {
                headers: headers,
                statusCode: 200,
                body: JSON.stringify({
                    tempalteId: req.templateId,
                    sender: res.envelope.from,
                    recipient: req.recipient,
                    messageId: res.messageId,
                }),
            };
        })
        .catch(err => {
            return {
                headers: headers,
                statusCode: 500,
                body: JSON.stringify({
                    message: err.message,
                    code: ErrorCode.ES2,
                }),
            };
        });
};
