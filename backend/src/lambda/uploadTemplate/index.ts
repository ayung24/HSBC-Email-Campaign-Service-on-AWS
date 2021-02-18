import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult, Handler } from 'aws-lambda';
import { IUploadTemplateReqBody } from '../types';
import * as db from '../../database/dbOperations';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost, PresignedPost } from '@aws-sdk/s3-presigned-post';
import { Conditions } from '@aws-sdk/s3-presigned-post/types/types';

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || '';
const S3_BUCKET_KEY = process.env.S3_BUCKET_KEY || '';
const postPolicy: Conditions[] = [
    { acl: "bucket-owner-full-control"}, 
    {bucket: S3_BUCKET_NAME}, 
    ['starts-with', '$key', S3_BUCKET_KEY]
];
const headers = {
    'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    'Content-Type': 'application/json',
}

const getPresignedPost = async function (key: string): Promise<PresignedPost> {
    const s3 = new S3Client({});
    return createPresignedPost(s3, {
        Bucket: S3_BUCKET_NAME,
        Key: `${S3_BUCKET_KEY}/${key}`,
        Conditions: postPolicy,
        Fields: {
            acl: "bucket-owner-full-control",
        },
        Expires: 60
    })
}

export const handler: APIGatewayProxyHandler = async function (event: APIGatewayProxyEvent) {
    const user = event.headers['Authorization'];
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
    
    const req: IUploadTemplateReqBody = JSON.parse(event.body);
    
    // 1. validate name
    const nameExists = (await db.GetMetadataByID(req.name)).status.succeeded;
    if (nameExists) {
        return {
            headers,
            statusCode: 400,
            body: JSON.stringify({
                "message": `Duplicate template name: ${req.name}`,
                "code": ""
            })
        }
    }

    // 2. generate & encrypt API key

    // 3. store metadata to DynamoDB
    const {status, metadata} =  await db.AddMetadataEntry(req.name)
    if (!status.succeeded || !metadata) {
        return {
            headers,
            statusCode: 500,
            body: JSON.stringify({
                "message": `Failed to upload template: ${status.info}`,
                "code": ""
            })
        }
    }
    
    // 4. store HTML to DynamoDB
    const addHtml = (await db.AddHTMLEntry({
        html: req.html,
        fieldNames: [] as string[],
        apiKey: '',
        templateID: metadata.templateID
    })).status
    if (!addHtml.succeeded) {
        // error
    }
    
    // 5. get S3 pre-signed URL
    const presignedPost = await getPresignedPost(metadata.templateID);
    return {
        headers,
        statusCode: 200,
        body: JSON.stringify({
        "templateID": metadata.templateID,
        "name": metadata.name,
        "timeCreated": metadata.timeCreated,
        "imageUpload": presignedPost}),
    }
}
