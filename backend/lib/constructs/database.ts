import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as s3 from '@aws-cdk/aws-s3';

export class Database extends cdk.Construct {
    private readonly REMOVAL_POLICY: cdk.RemovalPolicy;
    private readonly AUTO_DELETE_OBJECTS: boolean;

    private _metadata: dynamodb.Table;
    private _htmlBucket: s3.Bucket;
    private _imageBucket: s3.Bucket;

    constructor(scope: cdk.Construct, id: string, buildEnv: string) {
        super(scope, id);
        const isDev = buildEnv === 'dev';
        this.REMOVAL_POLICY = isDev ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN;
        this.AUTO_DELETE_OBJECTS = isDev;
        this._initTable(scope);
        this._initBuckets(scope);
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

    public htmlBucket(): s3.Bucket {
        return this._htmlBucket;
    }

    public imageBucket(): s3.Bucket {
        return this._imageBucket;
    }

    public metadataTable(): dynamodb.Table {
        return this._metadata;
    }
}
