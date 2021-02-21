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

    // get items from start to start + limit
    //console.log(event.start);
    //const req: IListTemplatesBody = JSON.parse(event.body);
    // might need to convert start/limit to date objects
    const listTemplates = db.ListMetadataByDate(event.start, event.limit);
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
