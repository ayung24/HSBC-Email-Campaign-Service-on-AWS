import { JsonSchemaType } from '@aws-cdk/aws-apigateway';
import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult, Handler } from 'aws-lambda';
import { v4 as uuid } from 'uuid';
import { IUploadTemplateRequestBody } from '../types';

async function mySecrets(): Promise<string> {
    // Load the AWS SDK
    var AWS = require('aws-sdk'),
        region = "ca-central-1",
        secretName = "API_Key_Secret",
        secret,
        decodedBinarySecret;

    // Create a Secrets Manager client
    var client = new AWS.SecretsManager({
        region: region
    });

    return new Promise((resolve,reject)=>{
        client.getSecretValue({SecretId: secretName}, function(err: any, data: any) {

            // In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
            // See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
            // We rethrow the exception by default.
            if (err) {
                reject(err);
            }
            else {
                // Decrypts secret using the associated KMS CMK.
                // Depending on whether the secret is a string or binary, one of these fields will be populated.
                if ('SecretString' in data) {
                    resolve(data.SecretString);
                } else {
                    let buff = new Buffer(data.SecretBinary, 'base64');
                    resolve(buff.toString('ascii'));
                }
            }
        });
    });
}

async function generateEncryptedApiKey(): Promise<string> {
    const uuidAPIKey = require('uuid-apikey');
    const Cryptr = require('cryptr');

    const apiKeyUuid: string = uuid();
    const apiKey: string = uuidAPIKey.toAPIKey(apiKeyUuid);

    const secretValue: string = await mySecrets();
    const cryptr = new Cryptr(secretValue);
    const encryptedApiKey:string = cryptr.encrypt(apiKey);

    return encryptedApiKey;
}

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
        const encryptedApiKey: string = await generateEncryptedApiKey();

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
