import * as cdk from '@aws-cdk/core';
import { BlockPublicAccess, Bucket, BucketEncryption, CorsRule, HttpMethods } from '@aws-cdk/aws-s3';

export class DataStore extends cdk.Construct {
    private _templateImgBucket: Bucket;

    // By default, every bucket accepts only GET requests from another domain,
    // so need explicit CORS rule to enable upload from client
    private _templateImgBucketCors: CorsRule = {
        allowedOrigins: ['*'],
        allowedMethods: [HttpMethods.PUT],
        maxAge: 3000,
        allowedHeaders: ['Authorization'],
    };

    constructor(scope: cdk.Construct, id: string) {
        super(scope, id);

        this._initBucket(scope);
    }

    private _initBucket(scope: cdk.Construct) {
        this._templateImgBucket = new Bucket(scope, 'TemplateImgBucket', {
            versioned: false,
            encryption: BucketEncryption.UNENCRYPTED,
            publicReadAccess: false,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // TODO #23: For dev only
            cors: [this._templateImgBucketCors],
        });
    }

    public tempateImgBucket(): Bucket {
        return this._templateImgBucket;
    }
}
