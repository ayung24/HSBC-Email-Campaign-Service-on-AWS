import { JsonSchemaType } from '@aws-cdk/aws-apigateway';
import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult, Handler } from 'aws-lambda';
import { v4 as uuid } from 'uuid';
import { IUploadTemplateRequestBody } from '../types';

export const handler: APIGatewayProxyHandler = async function (event: APIGatewayProxyEvent) {
    console.log('request:', JSON.stringify(event, undefined, 2));
    const user = event.headers['Authorization'];
    let response: APIGatewayProxyResult;
    if (!event.body) {
        response = {
            statusCode: 400,
            body: JSON.stringify({
                "Message": "Invalid request format",
                "Code": ""
            })
        }
    } else {
        const body: IUploadTemplateRequestBody = JSON.parse(event.body)
        
        // validate name

        // generate template ID
        const templateId: string = uuid();

        // generate & encrypt API key

        // store metadata to DynamoDB

        // create S3 pre-signed URL

        response = {
            statusCode: 200,
            body: JSON.stringify({
            "TemplateID": templateId,
            "Name": body.Name,
            "TimeCreated": "",
            "ImageUploadURL": "", 
        }),
    }
    }

    return {
        ... response,
        headers: {
            'Access-Control-Allow-Origin': '*', // Required for CORS support to work
            'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
            'Content-Type': 'application/json',
        },
    };
}
