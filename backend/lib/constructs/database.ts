import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import { S3EventSource } from '@aws-cdk/aws-lambda-event-sources';
import * as s3 from '@aws-cdk/aws-s3';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { config } from '../config';
import { EmailCampaignServiceStack } from '../emailCampaignServiceStack';
import { LogGroup, RetentionDays } from '@aws-cdk/aws-logs';

export class Database extends cdk.Construct {
    private readonly REMOVAL_POLICY: cdk.RemovalPolicy;
    private readonly AUTO_DELETE_OBJECTS: boolean;

    private _metadata: dynamodb.Table;
    private _htmlBucket: s3.Bucket;
    private _imageBucket: s3.Bucket;
    private _processHTML: lambda.Function;
    private _removeImages: lambda.Function;

    private readonly _processHTMLLambdaName: string;
    private readonly _removeImagesLambdaName: string;

    constructor(scope: cdk.Construct, id: string, buildEnv: string) {
        super(scope, id);
        const isDev = buildEnv === 'dev';
        this.REMOVAL_POLICY = isDev ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN;
        this.AUTO_DELETE_OBJECTS = isDev;
        this._processHTMLLambdaName = `ProcessHTMLHandler-${buildEnv}`;
        this._removeImagesLambdaName = `RemoveImagesHandler-${buildEnv}`;
        this._initTable(scope);
        this._initBuckets(scope);
        this._initFunctions(scope);
        this._initLogGroups(scope);
    }

    private _initTable(scope: cdk.Construct) {
        // shared template key name
        const TEMPLATE_KEY = 'templateId';
        // sort key
        const metaDataSortKey = { name: 'timeCreated', type: dynamodb.AttributeType.NUMBER };

        // >> init metadata table
        this._metadata = new dynamodb.Table(scope, 'MetadataTable', {
            partitionKey: { name: TEMPLATE_KEY, type: dynamodb.AttributeType.STRING },
            sortKey: metaDataSortKey,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: this.REMOVAL_POLICY,
        });

        // query by name and status
        this._metadata.addGlobalSecondaryIndex({
            indexName: 'name-and-status-index',
            partitionKey: {
                name: 'templateStatus',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'templateName',
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL,
        });

        // query by template id and status
        this._metadata.addGlobalSecondaryIndex({
            indexName: 'id-and-status-index',
            partitionKey: {
                name: 'templateStatus',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: TEMPLATE_KEY,
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL,
        });

        // query (filter) by status
        this._metadata.addGlobalSecondaryIndex({
            indexName: 'status-index',
            partitionKey: {
                name: 'templateStatus',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: metaDataSortKey,
            projectionType: dynamodb.ProjectionType.ALL,
        });
    }

    private _initBuckets(scope: cdk.Construct) {
        this._htmlBucket = new s3.Bucket(scope, 'HTMLBucket', {
            versioned: false,
            encryption: s3.BucketEncryption.UNENCRYPTED,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: this.REMOVAL_POLICY,
            autoDeleteObjects: this.AUTO_DELETE_OBJECTS,
            // By default, every bucket accepts only GET requests from another domain,
            // so need explicit CORS rule to enable upload from client
            cors: [
                {
                    allowedOrigins: ['*'],
                    allowedMethods: [s3.HttpMethods.POST],
                    maxAge: 3000,
                    allowedHeaders: ['Authorization'],
                },
            ],
        });

        this._imageBucket = new s3.Bucket(scope, 'ImageBucket', {
            versioned: false,
            encryption: s3.BucketEncryption.UNENCRYPTED,
            accessControl: s3.BucketAccessControl.PUBLIC_READ,
            publicReadAccess: true,
            removalPolicy: this.REMOVAL_POLICY,
            autoDeleteObjects: this.AUTO_DELETE_OBJECTS,
            cors: [
                {
                    allowedOrigins: ['*'],
                    allowedMethods: [s3.HttpMethods.POST],
                    maxAge: 3000,
                    allowedHeaders: ['Authorization'],
                },
            ],
        });
    }

    private _initFunctions(scope: cdk.Construct) {
        // HTML on create lambda
        this._processHTML = new NodejsFunction(scope, 'ProcessHTMLHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambda.LAMBDA_ROOT}/processHTML/index.ts`,
            bundling: {
                nodeModules: ['cheerio'],
                target: config.lambda.BUILD_TARGET,
            },
            environment: {
                HTML_BUCKET_NAME: this._htmlBucket.bucketName,
                SRC_HTML_PATH: config.s3.SRC_HTML_PATH,
                PROCESSED_HTML_PATH: config.s3.PROCESSED_HTML_PATH,
                IMAGE_BUCKET_NAME: this._imageBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(10),
            functionName: this._processHTMLLambdaName,
        });
        this._processHTML.addEventSource(
            new S3EventSource(this._htmlBucket, {
                events: [s3.EventType.OBJECT_CREATED],
                filters: [{ prefix: config.s3.SRC_HTML_PATH }],
            }),
        );
        this._htmlBucket.grantRead(this._processHTML, `${config.s3.SRC_HTML_PATH}*`);
        this._htmlBucket.grantDelete(this._processHTML, `${config.s3.SRC_HTML_PATH}*`);
        this._htmlBucket.grantPut(this._processHTML, `${config.s3.PROCESSED_HTML_PATH}*`);
        this._imageBucket.grantPut(this._processHTML);

        // HTML on delete lambda
        this._removeImages = new NodejsFunction(scope, 'RemoveImagesHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambda.LAMBDA_ROOT}/removeImages/index.ts`,
            environment: {
                IMAGE_BUCKET_NAME: this._imageBucket.bucketName,
                PROCESSED_HTML_PATH: config.s3.PROCESSED_HTML_PATH,
            },
            functionName: this._removeImagesLambdaName,
        });
        this._removeImages.addEventSource(
            new S3EventSource(this._htmlBucket, {
                events: [s3.EventType.OBJECT_REMOVED],
                filters: [{ prefix: config.s3.PROCESSED_HTML_PATH }],
            }),
        );
        this._imageBucket.grantRead(this._removeImages);
        this._imageBucket.grantDelete(this._removeImages);
    }

    private _initLogGroups(scope: cdk.Construct) {
        new LogGroup(scope, 'ProcessHTMLHandlerLogs', {
            logGroupName: EmailCampaignServiceStack.logGroupNamePrefix + this._processHTMLLambdaName,
            retention: RetentionDays.SIX_MONTHS,
            removalPolicy: this.REMOVAL_POLICY,
        });
        new LogGroup(scope, 'RemoveImagesHandlerLogs', {
            logGroupName: EmailCampaignServiceStack.logGroupNamePrefix + this._removeImagesLambdaName,
            retention: RetentionDays.SIX_MONTHS,
            removalPolicy: this.REMOVAL_POLICY,
        });
    }

    public htmlBucket(): s3.Bucket {
        return this._htmlBucket;
    }

    public metadataTable(): dynamodb.Table {
        return this._metadata;
    }
}
