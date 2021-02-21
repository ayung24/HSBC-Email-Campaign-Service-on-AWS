import { APIGatewayProxyEvent, APIGatewayProxyHandler, Handler } from 'aws-lambda';
import * as db from '../../database/dbOperations';
import { IMetadataEntry } from '../../database/interfaces';

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
    // const req: IListTemplatesBody = JSON.parse(event.body);

    // TODO: Implement pagination (Requesting whole range of dates temporarily)
    const listTemplates = db.ListMetadataByDate('0', new Date().getTime().toString());
    return listTemplates
        .then((res: IMetadataEntry[]) => {
            return {
                headers: headers,
                statusCode: 200,
                body: JSON.stringify({
                    templates: res,
                }),
            };
        })
        .catch(err => {
            return {
                headers: headers,
                statusCode: 500,
                body: JSON.stringify({
                    message: err.message,
                    code: '',
                }),
            };
        });
};
