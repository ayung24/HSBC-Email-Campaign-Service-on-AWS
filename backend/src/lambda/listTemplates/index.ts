import { Handler } from 'aws-lambda';
import * as db from "../../database/dbOperations";
import { IListTemplatesBody } from '../types';

const AWS = require('aws-sdk');
// check server region
// AWS.config.update({region: `us-east-2`});
// const db = new AWS.DynamoDB.DocumentClient({region: 'us-east-2'});
const headers = {
    'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    'Content-Type': 'application/json',
}
export const handler: Handler = async function (event) {
    // TODO: #10
    // stub
    console.log('request:', JSON.stringify(event, undefined, 2));
    const user = event.headers['Authorization'];

    console.log(user);
    if (!event.body) {
        return {
            headers,
            statusCode: 400,
            body: JSON.stringify({
                "message": "Invalid request format",
                "code": ""
            })
        }
    }

    // get items from start to start + limit
    const req: IListTemplatesBody = JSON.parse(event.body);
    const listTemplates = db.ListMetadataByDate(req.start, req.limit);
    return listTemplates.then((res) => {
        return {
            headers,
            statusCode: 200,
            body: JSON.stringify({
                listTemplates
            }),
        }
    }).catch(err => {
        return {
            headers,
            statusCode: 500,
            body: "Something failed!!!"
        }
    })
    
};
