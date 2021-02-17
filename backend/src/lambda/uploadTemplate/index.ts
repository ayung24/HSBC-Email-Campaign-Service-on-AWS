import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult, Handler } from 'aws-lambda';
import { v4 as uuid } from 'uuid';
import { IUploadTemplateReqBody } from '../types';
import * as db from '../../database/dbOperations';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { Conditions } from '@aws-sdk/s3-presigned-post/types/types';

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || '';
const S3_BUCKET_KEY = process.env.S3_BUCKET_KEY || '';
const s3 = new S3Client({});
const postPolicy: Conditions[] = [
    { acl: "public-read"}, 
    {bucket: S3_BUCKET_NAME}, 
    ['starts-with', '$key', S3_BUCKET_KEY]
];

export const handler: APIGatewayProxyHandler = async function (event: APIGatewayProxyEvent) {
    console.log('request:', JSON.stringify(event, undefined, 2));
    const user = event.headers['Authorization'];
    let response: APIGatewayProxyResult;
    if (!event.body) {
        response = {
            statusCode: 400,
            body: JSON.stringify({
                "message": "Invalid request format",
                "code": ""
            })
        }
    } else {
        const req: IUploadTemplateReqBody = JSON.parse(event.body);
        // validate name

        // generate template ID
        const templateId: string = uuid();

        // generate & encrypt API key

        // store metadata to DynamoDB
        db.AddMetadataEntry({TemplateID: templateId, Name: req.name, TimeCreated: new Date()})

        // create S3 pre-signed URL
        const { url, fields } = await createPresignedPost(s3, {
            Bucket: S3_BUCKET_NAME,
            Key: `${S3_BUCKET_KEY}\${filename}`,
            Conditions: postPolicy,
            Fields: {
                acl: "public-read",
            },
            Expires: 2 * 60
        })

        response = {
            statusCode: 200,
            body: JSON.stringify({
            "templateId": templateId,
            "name": req.name,
            "timeCreated": "",
            "imageUploadURL": url, 
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
