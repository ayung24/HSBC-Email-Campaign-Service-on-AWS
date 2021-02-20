import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';

import { config } from '../config';

// dont really know how to get around this...
import * as dbDefinitions from '../../src/database/interfaces';

// TODO: delete this
import * as agw from '@aws-cdk/aws-apigateway';

export class DatabaseService {
    private readonly DEBUG: boolean = true;

    private readonly _metadata: dynamodb.Table;
    private readonly _html: dynamodb.Table;
    
    private _linkedLambdas: any; 

    constructor(scope: cdk.Construct) {
        this._linkedLambdas = {}; // for checking that config is only added once

        // TODO: #23
        const determinedRemovalPolicy = this.DEBUG ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN

        // shared template key name
        const TEMPLATE_KEY = 'templateId';
        // sort key
        const metaDataSortKey = { name: 'timeCreated', type: dynamodb.AttributeType.NUMBER };

        // >> init metadata table
        this._metadata = new dynamodb.Table(scope, dbDefinitions.TableName.METADATA, {
            partitionKey: { name: TEMPLATE_KEY, type: dynamodb.AttributeType.STRING },
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
        this._html = new dynamodb.Table(scope, dbDefinitions.TableName.HTML, {
            partitionKey: { name: TEMPLATE_KEY, type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: determinedRemovalPolicy,
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

    private _tryAddConfig(lambda: lambda.Function) {
        if (this._linkedLambdas[lambda.functionName] !== undefined) {
            this._linkedLambdas[lambda.functionName] = true; // mark as linked
            lambda.addEnvironment('dynamoApiVersion', config.dynamo.apiVersion)
        }
    }

    public AssignMetadataTable(lambda: lambda.Function): void {
        this._tryAddConfig(lambda);
        lambda.addEnvironment(dbDefinitions.TableName.METADATA, this._metadata.tableName);
        this._metadata.grantReadWriteData(lambda);
    }

    public AssignHTMLTable(lambda: lambda.Function): void {
        this._tryAddConfig(lambda);
        lambda.addEnvironment(dbDefinitions.TableName.HTML, this._html.tableName);
        this._html.grantReadWriteData(lambda);
    }

    // TODO: delete this
    public InitDebug(scope: cdk.Construct, api: agw.RestApi) {
        const testdb = new NodejsFunction(scope, 'TestDBHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambdaRoot}/databaseTest/index.ts`,
        });
        this.AssignMetadataTable(testdb);
        this.AssignHTMLTable(testdb);

        const testResource = api.root.addResource('TestDB')
        const testIntegration = new agw.LambdaIntegration(testdb);
        testResource.addMethod('GET', testIntegration);
    }
}