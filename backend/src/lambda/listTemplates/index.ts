import { Handler } from 'aws-lambda';
import * as db from "../../database/dbOperations";

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
    const params = {
        TableName: 'metadataTable',
        Start: event['start'],
        Limit: event['limit']
    };

    const {status, metadataList} = await db.ListMetadataByDate(params.Start, params.Limit);
    if (!status.succeeded || !metadataList) {
        return {
            headers,
            statusCode: 500,
            body: JSON.stringify({
                "message": `Failed get templates: ${status.info}`,
                "code": ""
            })
        }
    }

    // maybe Tony can use this query
    // return db.query({
    //     TableName: 'metadataTable',
    //     KeyConditionExpression: '#index BETWEEN :indexLow AND :indexHigh',
    //     ExpressionAttributeNames: {
    //         '#id': 'id',
    //         '#index': 'index',
    //     },
    //     ExpressionAttributeValues: {
    //         ':indexLow': params.Start,
    //         ':indexHigh': params.Limit,
    //     },
    // }).promise();

    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*', // Required for CORS support to work
            'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            metadataList
        }),
    };
};
