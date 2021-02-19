import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as agw from '@aws-cdk/aws-apigateway';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

import { UserPool } from '@aws-cdk/aws-cognito'
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { config } from '../config';
import { CognitoUserPoolsAuthorizer } from '@aws-cdk/aws-apigateway';

export class TemplateService {
    private readonly DEBUG: boolean = true;
    private readonly PARTITION_KEY = 'templateId';

    private _metadata: dynamodb.Table;
    private _html: dynamodb.Table;
    private _testdb: lambda.Function;

    private _upload: lambda.Function;
    private _list: lambda.Function;
    private _authorizer: CognitoUserPoolsAuthorizer;

    constructor(scope: cdk.Construct, api: agw.RestApi) {
        this._initDynamo(scope);
        this._initFunctions(scope);
        this._initAuth(scope);
        this._initPaths(api);

        if (this.DEBUG)
            this._initDebug(scope, api);
    }

    private _initAuth(scope: cdk.Construct) {
        const userPool = UserPool.fromUserPoolId(scope, 'UserPool', config.cognito.USER_POOL_ID);
        this._authorizer = new agw.CognitoUserPoolsAuthorizer(scope, 'TemplateAuthorizer', {
            cognitoUserPools: [userPool],
        });
    }

    private _initDynamo(scope: cdk.Construct) {
        let determinedRemovalPolicy = this.DEBUG ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN

        // >> init metadata table
        // status sort key
        const metaDataSortKey = { name: 'timeCreated', type: dynamodb.AttributeType.NUMBER};
        this._metadata = new dynamodb.Table(scope, 'metadata', {
            partitionKey: { name: this.PARTITION_KEY, type: dynamodb.AttributeType.STRING },
            sortKey: metaDataSortKey,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: determinedRemovalPolicy,
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

        // query by status
        this._metadata.addGlobalSecondaryIndex({
            indexName: 'status-index',
            partitionKey: {
                name: 'templateStatus',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: metaDataSortKey,
            projectionType: dynamodb.ProjectionType.ALL,
        });

        // init html table
        this._html = new dynamodb.Table(scope, 'html', {
            partitionKey: { name: this.PARTITION_KEY, type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'templateStatus', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: determinedRemovalPolicy,
        });

        // const csv = new dynamodb.Table(scope, 'metadataPartition', {
        //     partitionKey: { name: 'templateID', type: dynamodb.AttributeType.STRING },
        //     billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
        // });
    }

    private _initFunctions(scope: cdk.Construct) {
        this._upload = new NodejsFunction(scope, 'UploadTemplateHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambdaRoot}/uploadTemplate/index.ts`,
            bundling: {
                externalModules: ['uuid']
            },
            environment: {
                METADATA_TABLE_NAME: this._metadata.tableName,
                HTML_TABLE_NAME: this._html.tableName,
                PARTITION_KEY: this.PARTITION_KEY,
            },
        });
        this._metadata.grantReadWriteData(this._upload);
        this._html.grantReadWriteData(this._upload);

        this._list = new NodejsFunction(scope, 'ListTemplatesHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambdaRoot}/listTemplates/index.ts`,
            environment: {
                METADATA_TABLE_NAME: this._metadata.tableName,
                PARTITION_KEY: this.PARTITION_KEY,
            },
        });
        this._metadata.grantReadWriteData(this._list);
    }

    /**
     * Define templates endpoints
     * All template related (internal API) endpoints MUST include the templateAuth authorizer
     * */
    private _initPaths(api: agw.RestApi) {
        const templatesResource = api.root.addResource('templates');
        const uploadIntegration = new agw.LambdaIntegration(this._upload);
        const listIntegration = new agw.LambdaIntegration(this._list);

        templatesResource.addMethod('POST', uploadIntegration, { authorizer: this._authorizer });
        templatesResource.addMethod('GET', listIntegration, { authorizer: this._authorizer });


    }

    // TODO: delete this
    private _initDebug(scope: cdk.Construct, api: agw.RestApi) {

        this._testdb = new NodejsFunction(scope, 'TestDBHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambdaRoot}/databaseTest/index.ts`,
            environment: {
                METADATA_TABLE_NAME: this._metadata.tableName,
                HTML_TABLE_NAME: this._html.tableName,
                PARTITION_KEY: this.PARTITION_KEY,
            },
        });

        this._metadata.grantReadWriteData(this._testdb);
        this._html.grantReadWriteData(this._testdb);

        const testResource = api.root.addResource('TestDB')
        const testIntegration = new agw.LambdaIntegration(this._testdb);
        testResource.addMethod('GET', testIntegration);
    }
}
