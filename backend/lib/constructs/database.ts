import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { BlockPublicAccess, Bucket, BucketEncryption, HttpMethods } from '@aws-cdk/aws-s3';

import { config } from '../config';

// TODO: delete this
import * as agw from '@aws-cdk/aws-apigateway';

export class Database extends cdk.Construct {
    // TODO: #23
    private static readonly DEBUG: boolean = true;
    private static readonly REMOVAL_POLICY = Database.DEBUG ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN;

    private _metadata: dynamodb.Table;
    private _html: dynamodb.Table;
    private _imageBucket: Bucket;

    constructor(scope: cdk.Construct, id: string) {
        super(scope, id);
        this._initTables(scope);
        this._initBucket(scope);
    }

    private _initTables(scope: cdk.Construct) {
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

        // query by name
        this._metadata.addGlobalSecondaryIndex({
            indexName: 'name-index',
            partitionKey: {
                name: 'templateName',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: metaDataSortKey,
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

        // >> init html table
        this._html = new dynamodb.Table(scope, 'HTMLTable', {
            partitionKey: { name: TEMPLATE_KEY, type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: Database.REMOVAL_POLICY,
        });

        // query (filter) by status
        this._html.addGlobalSecondaryIndex({
            indexName: 'status-index',
            partitionKey: {
                name: 'templateStatus',
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL,
        });

        // >> init csv table
        // const csv = new dynamodb.Table(scope, 'metadataPartition', {
        //     partitionKey: { name: TEMPLATE_KEY, type: dynamodb.AttributeType.STRING },
        //     billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
        // });
    }

    private _initBucket(scope: cdk.Construct) {
        this._imageBucket = new Bucket(scope, 'ImageBucket', {
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

    // TODO: delete this
    public InitDebug(scope: cdk.Construct, api: agw.RestApi) {
        const testdb = new NodejsFunction(scope, 'TestDBHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambdaRoot}/databaseLambda/index.ts`,
            environment: {
                METADATA_TABLE_NAME: this._metadata.tableName,
                HTML_TABLE_NAME: this._html.tableName,
                DYNAMO_API_VERSION: config.dynamo.apiVersion,
            },
        });
        this._metadata.grantReadWriteData(testdb);
        this._html.grantReadWriteData(testdb);

        const testResource = api.root.addResource('TestDB');
        const testIntegration = new agw.LambdaIntegration(testdb);
        testResource.addMethod('GET', testIntegration);
    }

    public imageBucket(): Bucket {
        return this._imageBucket;
    }

    public metadataTable(): dynamodb.Table {
        return this._metadata;
    }

    public htmlTable(): dynamodb.Table {
        return this._html;
    }
}
