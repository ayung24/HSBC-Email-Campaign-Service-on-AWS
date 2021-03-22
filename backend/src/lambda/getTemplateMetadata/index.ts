import { APIGatewayProxyEvent } from 'aws-lambda';
import * as db from '../../database/dbOperations';
import { ITemplateFullEntry } from '../../database/dbInterfaces';
import { ErrorCode, ErrorMessages, ESCError } from '../../ESCError';
import * as Logger from '../../../logger';

const headers = {
    'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    'Content-Type': 'application/json',
};

export const handler = async function (event: APIGatewayProxyEvent) {
    Logger.logRequestInfo(event);
    if (!event.pathParameters || !event.pathParameters.id) {
        return {
            headers: headers,
            statusCode: 400,
            body: JSON.stringify({
                message: ErrorMessages.INVALID_REQUEST_FORMAT,
                code: ErrorCode.TS4,
            }),
        };
    }
    const id: string = event.pathParameters.id;
    return db
        .GetTemplateById(id)
        .then((res: ITemplateFullEntry) => {
            return {
                headers: headers,
                statusCode: 200,
                body: JSON.stringify(res),
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
                code = ErrorCode.TS28;
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
