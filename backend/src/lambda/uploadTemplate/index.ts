import { IUploadTemplateReqBody } from '../types';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost, PresignedPost } from '@aws-sdk/s3-presigned-post';
import { APIGatewayProxyEvent } from 'aws-lambda';

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || '';
const PRESIGNED_URL_EXPIRY = process.env.PRESIGNED_URL_EXPIRY ? Number.parseInt(process.env.PRESIGNED_URL_EXPIRY) : null;

const headers = {
    'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    'Content-Type': 'application/json',
};

/**
 * Creates a POST pre-signed URL client can directly use to access S3
 * @param key bucket key to put object in
 */
const getPresignedPost = async function (key: string): Promise<PresignedPost> {
    const s3 = new S3Client({});
    return createPresignedPost(s3, {
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Conditions: [
            { acl: 'bucket-owner-full-control' },
            { bucket: S3_BUCKET_NAME },
            ['starts-with', '$key', key],
            ['starts-with', '$Content-Type', 'application/zip'], // only accept zip files
        ],
        Fields: {
            acl: 'bucket-owner-full-control',
        },
        Expires: PRESIGNED_URL_EXPIRY,
    });
};

export const handler = async function (event: APIGatewayProxyEvent) {
    if (!event.body) {
        return {
            headers,
            statusCode: 400,
        };
    }

    const req: IUploadTemplateReqBody = JSON.parse(event.body);

    // 5. get S3 pre-signed URL
    const presignedPost = await getPresignedPost(req.name); // TODO #9: Change to template ID
    return {
        headers,
        statusCode: 200,
        body: JSON.stringify({
            name: req.name,
            imageUpload: presignedPost,
        }),
    };
};
