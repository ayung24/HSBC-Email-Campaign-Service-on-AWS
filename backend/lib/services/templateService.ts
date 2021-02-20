import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as agw from '@aws-cdk/aws-apigateway';

import { UserPool } from '@aws-cdk/aws-cognito'
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { config } from '../config';
import { CognitoUserPoolsAuthorizer } from '@aws-cdk/aws-apigateway';
import { Database } from './databaseService';

export class TemplateService {
    private _upload: lambda.Function;
    private _list: lambda.Function;
    private _authorizer: CognitoUserPoolsAuthorizer;

    constructor(scope: cdk.Construct, api: agw.RestApi, database: Database) {
        this._initFunctions(scope, database);
        this._initAuth(scope);
        this._initPaths(api);

        // TODO: delete this
        database.InitDebug(scope, api);
    }

    private _initAuth(scope: cdk.Construct) {
        const userPool = UserPool.fromUserPoolId(scope, 'UserPool', config.cognito.USER_POOL_ID);
        this._authorizer = new agw.CognitoUserPoolsAuthorizer(scope, 'TemplateAuthorizer', {
            cognitoUserPools: [userPool],
        });
    }

    private _initFunctions(scope: cdk.Construct, database: Database) {
        this._upload = new NodejsFunction(scope, 'UploadTemplateHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambdaRoot}/uploadTemplate/index.ts`,
            bundling: {
                nodeModules: ['@aws-sdk/client-s3', '@aws-sdk/s3-presigned-post'],
            },
            environment: {
                METADATA_TABLE_NAME: database.metadataTable().tableName,
                HTML_TABLE_NAME: database.htmlTable().tableName,
                S3_BUCKET_NAME: database.imageBucket().bucketName,
                PRESIGNED_URL_EXPIRY: config.env.PRESIGNED_URL_EXPIRY,
                DYNAMO_API_VERSION: config.dynamo.apiVersion,
            },
        });
        // configure upload template lambda permissions
        database.imageBucket().grantPut(this._upload);              // PUT in image bucket
        database.metadataTable().grantReadWriteData(this._upload);  // READ/WRITE on metadata table
        database.htmlTable().grantReadWriteData(this._upload);      // READ/WRITE on html table

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

        templatesResource.addMethod('POST', uploadIntegration);
        templatesResource.addMethod('GET', listIntegration, { authorizer: this._authorizer });
    }
}
