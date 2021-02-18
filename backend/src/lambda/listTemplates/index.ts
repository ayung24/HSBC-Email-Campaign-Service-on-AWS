import { Handler } from 'aws-lambda';
const AWS = require('aws-sdk');
AWS.config.update({region: `eu-west-2`});
const db = new AWS.DynamoDB.DocumentClient({region: 'TEMPORARY'});

export const handler: Handler = async function (event) {
    // TODO: #10
    // stub
    console.log('request:', JSON.stringify(event, undefined, 2));
    const user = event.headers['Authorization'];

    // get items from start to start + limit
    const params = {
        TableName: 'TABLE NAME HERE',
        Start: event['start'],
        Limit: event['limit']
    };

    return db.query({
        TableName: 'TABLE NAME HERE',
        KeyConditionExpression: '#index BETWEEN :indexLow AND :indexHigh',
        ExpressionAttributeNames: {
            '#id': 'id',
            '#index': 'index',
        },
        ExpressionAttributeValues: {
            ':indexLow': params.Start,
            ':indexHigh': params.Limit,
        },
    }).promise();


    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*', // Required for CORS support to work
            'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            eventPath: event.path,
            test: 'listTemplates',
            user: user,
        }),
    };
};
