import { S3CreateEvent } from 'aws-lambda';
import { ErrorCode, ErrorMessages, ESCError } from '../../ESCError';
import { isEmptyArray } from '../../commonFunctions';
import * as db from '../../database/dbOperations';
import { IDeleteImagesResult } from '../../database/dbInterfaces';

const IMAGE_BUCKET_NAME = process.env.IMAGE_BUCKET_NAME;
const PROCESSED_HTML_PATH = process.env.PROCESSED_HTML_PATH;

const validateEnv = function (): boolean {
    return !!IMAGE_BUCKET_NAME && !!PROCESSED_HTML_PATH;
};

export const handler = async function (event: S3CreateEvent) {
    if (!validateEnv()) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: ErrorMessages.INTERNAL_SERVER_ERROR,
                code: ErrorCode.TS11,
            }),
        };
    } else if (!Array.isArray(event.Records) || isEmptyArray(event.Records)) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'No S3 remove event',
                code: ErrorCode.TS12,
            }),
        };
    }

    const removeEvent = event.Records[0];
    const templateId = decodeURIComponent(removeEvent.s3.object.key.replace(/\+/g, ' ')).replace(PROCESSED_HTML_PATH!, '');
    return db
        .DeleteImagesByTemplateId(templateId)
        .then((deleteRes: IDeleteImagesResult) => {
            return {
                statusCode: 200,
                body: JSON.stringify(deleteRes),
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
                code = ErrorCode.TS31;
            }
            return {
                statusCode: statusCode,
                body: JSON.stringify({
                    message: message,
                    code: code,
                }),
            };
        });
};
