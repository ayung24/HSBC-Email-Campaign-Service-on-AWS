import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { BlockPublicAccess, Bucket, BucketEncryption, HttpMethods } from '@aws-cdk/aws-s3';

export class Database extends cdk.Construct {
    // TODO: #23
    private static readonly DEBUG: boolean = true;
    private static readonly REMOVAL_POLICY = Database.DEBUG ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN;

    private _metadata: dynamodb.Table;
    private _htmlBucket: Bucket;

    constructor(scope: cdk.Construct, id: string) {
        super(scope, id);
        this._initTable(scope);
        this._initBucket(scope);
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
            removalPolicy: Database.REMOVAL_POLICY,
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

    private _initBucket(scope: cdk.Construct) {
        this._htmlBucket = new Bucket(scope, 'HTMLBucket', {
            versioned: false,
            encryption: BucketEncryption.UNENCRYPTED,
            publicReadAccess: false,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            removalPolicy: Database.REMOVAL_POLICY,
            // By default, every bucket accepts only GET requests from another domain,
            // so need explicit CORS rule to enable upload from client
            cors: [
                {
                    allowedOrigins: ['*'],
                    allowedMethods: [HttpMethods.POST],
                    maxAge: 3000,
                    allowedHeaders: ['Authorization'],
                },
            ],
        });
    }

    public htmlBucket(): Bucket {
        return this._htmlBucket;
    }

    public metadataTable(): dynamodb.Table {
        return this._metadata;
    }
}
