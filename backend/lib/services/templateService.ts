import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { NodejsFunction } from 'aws-lambda-nodejs-esbuild';
import { config } from '../config';
import { RemovalPolicy } from '@aws-cdk/core';

export class TemplateService {
    private _metadata: dynamodb.Table;
    private _html: dynamodb.Table;

    private _upload: lambda.Function;
    private _list: lambda.Function;
    private _esbuildOptions = {
        target: 'es2018',
    };

    constructor(scope: cdk.Construct) {
        this._initDynamo(scope);
        this._initFunctions(scope);
    }

    private _initDynamo(scope: cdk.Construct) {
        // >> init metadata table
        // combined timestamp and status sort key
        const metaDataSortKey = { name: 'timeAndStatus', type: dynamodb.AttributeType.STRING };
        this._metadata = new dynamodb.Table(scope, 'metadata', {
            partitionKey: { name: 'templateID', type: dynamodb.AttributeType.STRING },
            sortKey: metaDataSortKey,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.DESTROY, // todo, persist tables
        });
        // query by name
        this._metadata.addGlobalSecondaryIndex({
            indexName: 'name-index',
            partitionKey: {
                name: 'name',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: metaDataSortKey,
            projectionType: dynamodb.ProjectionType.ALL,
        })

        // >> init html table
        this._html = new dynamodb.Table(scope, 'html', {
            partitionKey: { name: 'templateID', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'status', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.DESTROY, // todo, persist tables
        });

        // const csv = new dynamodb.Table(scope, 'metadataPartition', {
        //     partitionKey: { name: 'templateID', type: dynamodb.AttributeType.STRING },
        //     billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
        // });
    }

    private _initFunctions(scope: cdk.Construct) {
        this._upload = new NodejsFunction(scope, 'UploadTemplateHandler', {
            runtime: lambda.Runtime.NODEJS_10_X,
            rootDir: `${config.lambdaRoot}/uploadTemplate`,
            esbuildOptions: this._esbuildOptions,
        });
        this._list = new NodejsFunction(scope, 'ListTemplatesHandler', {
            runtime: lambda.Runtime.NODEJS_10_X,
            rootDir: `${config.lambdaRoot}/listTemplates`,
            esbuildOptions: this._esbuildOptions,
        });
    }

    public uploadTemplate(): lambda.Function {
        return this._upload;
    }

    public listTemplates(): lambda.Function {
        return this._list;
    }
}
