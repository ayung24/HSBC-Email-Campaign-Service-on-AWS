import * as db from '../../database/dbOperations';
import { ITemplateFullEntry } from '../../database/dbInterfaces';

const headers = {
    'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    'Content-Type': 'application/json',
};

export const handler = async function (id: string) {
    return db.GetTemplateById(id).then((res: ITemplateFullEntry) => {
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
                code: '',
            }),
        };
    });
};