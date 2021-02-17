import { Handler } from 'aws-lambda';

export const handler: Handler = async function (event) {
    // TODO: #10
    // stub
    console.log('request:', JSON.stringify(event, undefined, 2));
    const user = event.headers['Authorization'];
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
