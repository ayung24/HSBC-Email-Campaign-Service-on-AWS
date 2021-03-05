import { APIGatewayProxyEvent } from 'aws-lambda';
import { SESClient } from '@aws-sdk/client-ses';
import {createTransport, SentMessageInfo} from 'nodemailer';
import { ISendEmailReqBody } from '../lambdaInterfaces';
import * as db from '../../database/dbOperations';
import { ErrorCode } from '../../errorCode';

const VERIFIED_EMAIL_ADDRESS = process.env.VERIFIED_EMAIL_ADDRESS;
const VERSION = process.env.VERSION || '2010-12-01';
const HTML_BUCKET_NAME = process.env.HTML_BUCKET_NAME;

const ses = new SESClient({
    apiVersion: VERSION,
});
const transporter = createTransport({
    SES: ses
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
    return !!HTML_BUCKET_NAME && !!VERIFIED_EMAIL_ADDRESS;
};

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

    const req: ISendEmailReqBody = JSON.parse(event.body); 
    return db.GetHTMLById(req.templateId).then((html: string) => {
        const params = {
            from: VERIFIED_EMAIL_ADDRESS,
            to: VERIFIED_EMAIL_ADDRESS,
            subject: "Email subject",
            text: "replacement text",
            html: html
        };
        return transporter.sendMail(params);
    }).then((res: SentMessageInfo) => {
        console.info(res);
    }).catch(err => {
        console.warn(err);
    });
};
