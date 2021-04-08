import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import * as db from '../../database/dbOperations';
import { ITemplateBase } from '../../database/dbInterfaces';
import { ErrorCode, ErrorMessages, ESCError } from '../../ESCError';
import * as Logger from '../../logger';

const headers = {
    'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    'Content-Type': 'application/json',
};
export const handler: APIGatewayProxyHandler = async function (event: APIGatewayProxyEvent) {
    // TODO: Put back event body check after pagination implemented
    // if (!event.body) {
    //     return {
    //         headers: headers,
    //         statusCode: 400,
    //         body: JSON.stringify({
    //             message: 'Invalid request format',
    //             code: '',
    //         }),
    //     };
    // }
    // get items from start to start + limit

    Logger.logRequestInfo(event);

    // TODO: Implement pagination (Requesting whole range of dates temporarily)
    // If event is empty regular list all
    if (!event.queryStringParameters || !event.queryStringParameters.search) {
        return db
        .ListTemplatesByDate('0', new Date().getTime().toString())
        .then((res: ITemplateBase[]) => {
            return {
                headers: headers,
                statusCode: 200,
                body: JSON.stringify({
                    templates: res,
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
                code = ErrorCode.TS29;
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
    }

    // else fuzzy search through db
    // TODO change error codes 
    
    const id: string = event.queryStringParameters.search;
    return db
        .searchTemplates(id)
        .then((res: ITemplateBase[]) => {
            return {
                headers: headers,
                statusCode: 200,
                body: JSON.stringify({
                    templates: res,
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
                code = ErrorCode.TS29;
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
