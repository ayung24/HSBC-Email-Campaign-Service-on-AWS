import { APIGatewayProxyEvent } from 'aws-lambda';
import * as db from '../../database/dbOperations';
import { ITemplateFullEntry } from '../../database/dbInterfaces';
import { ErrorCode } from '../../errorCode';
import * as Logger from '../../../logger';

const headers = {
    'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    'Content-Type': 'application/json',
};

export const handler = async function (event: APIGatewayProxyEvent) {
    Logger.logRequestInfo(event);
    if (!event.pathParameters.id) {
        return {
            headers: headers,
            statusCode: 400,
            body: JSON.stringify({
                message: 'Invalid request format',
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
            return {
                headers: headers,
                statusCode: 500,
                body: JSON.stringify({
                    message: err.message,
                    code: ErrorCode.TS5,
                }),
            };
        });
};
