import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as agw from '@aws-cdk/aws-apigateway';
import { UserPool } from '@aws-cdk/aws-cognito'
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { config } from '../config';
import { CognitoUserPoolsAuthorizer } from '@aws-cdk/aws-apigateway';

export class TemplateService {
    private _metadata: dynamodb.Table;
    private _html: dynamodb.Table;

    private _upload: lambda.Function;
    private _list: lambda.Function;
    private _authorizer: CognitoUserPoolsAuthorizer;

    constructor(scope: cdk.Construct, api: agw.RestApi) {
        this._initDynamo(scope);
        this._initFunctions(scope);
        this._initAuth(scope);
        this._initPaths(api)
    }

    private _initAuth(scope: cdk.Construct) {
        const userPool = UserPool.fromUserPoolId(scope, 'UserPool', config.cognito.USER_POOL_ID);
        this._authorizer = new agw.CognitoUserPoolsAuthorizer(scope, 'TemplateAuthorizer', {
            cognitoUserPools: [userPool],
        });
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
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambdaRoot}/uploadTemplate/index.ts`,
            bundling: {
                externalModules: ['uuid']
            }
        });
        this._list = new NodejsFunction(scope, 'ListTemplatesHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambdaRoot}/listTemplates/index.ts`,
        });
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
}
