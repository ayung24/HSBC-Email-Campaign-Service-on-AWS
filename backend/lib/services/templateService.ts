import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as agw from '@aws-cdk/aws-apigateway';

import { UserPool } from '@aws-cdk/aws-cognito';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { config } from '../config';
import { CognitoUserPoolsAuthorizer } from '@aws-cdk/aws-apigateway';
import { Database } from '../constructs/database';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';

export class TemplateService {
    private _upload: lambda.Function;
    private _list: lambda.Function;
    private _templateMetadata: lambda.Function;
    private _authorizer: CognitoUserPoolsAuthorizer;
    constructor(scope: cdk.Construct, api: agw.RestApi, database: Database) {
        this._initFunctions(scope, database);
        this._initAuth(scope);
        this._initPaths(scope, api);
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
            entry: `${config.lambda.LAMBDA_ROOT}/uploadTemplate/index.ts`,
            bundling: {
                nodeModules: ['@aws-sdk/client-s3', '@aws-sdk/s3-presigned-post', 'uuid', 'uuid-apikey'],
            },
            environment: {
                METADATA_TABLE_NAME: database.metadataTable().tableName,
                HTML_BUCKET_NAME: database.htmlBucket().bucketName,
                PRESIGNED_URL_EXPIRY: config.s3.PRESIGNED_URL_EXPIRY,
                DYNAMO_API_VERSION: config.dynamo.apiVersion,
                KMS_REGION: config.KMS.REGION,
                KMS_ACCOUNT_ID: config.KMS.ACCOUNT_ID,
                KMS_KEY_ID: config.KMS.KEY_ID,
            },
        });
        // configure upload template lambda permissions
        database.htmlBucket().grantPut(this._upload); // PUT in HTML bucket
        database.metadataTable().grantReadWriteData(this._upload); // READ/WRITE on metadata table
        this._upload.addToRolePolicy(
            new PolicyStatement({
                actions: ['kms:Encrypt'],
                resources: [`arn:aws:kms:${config.KMS.REGION}:${config.KMS.ACCOUNT_ID}:key/${config.KMS.KEY_ID}`],
                effect: Effect.ALLOW,
            }),
        );

        this._templateMetadata = new NodejsFunction(scope, 'GetTemplateMetadataHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambda.LAMBDA_ROOT}/getTemplateMetadata/index.ts`,
            environment: {
                METADATA_TABLE_NAME: database.metadataTable().tableName,
                DYNAMO_API_VERSION: config.dynamo.apiVersion,
            },
        });
        database.metadataTable().grantReadData(this._templateMetadata);

        this._list = new NodejsFunction(scope, 'ListTemplatesHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambda.LAMBDA_ROOT}/listTemplates/index.ts`,
            environment: {
                METADATA_TABLE_NAME: database.metadataTable().tableName,
                DYNAMO_API_VERSION: config.dynamo.apiVersion,
            },
        });
        // configure list templates lambda permissions
        database.metadataTable().grantReadData(this._list); // READ on metadata table
    }

    /**
     * Define templates endpoints
     * All template related (internal API) endpoints MUST include the templateAuth authorizer
     * */
    private _initPaths(scope: cdk.Construct, api: agw.RestApi) {
        const uploadReqValidator = new agw.RequestValidator(scope, 'UploadTemplateValidator', {
            restApi: api,
            requestValidatorName: 'template-upload-req-validator',
            validateRequestBody: true,
        });
        const uploadReqModel = new agw.Model(scope, 'UploadTemplateReqModel', {
            restApi: api,
            contentType: 'application/json',
            description: 'Upload template request payload',
            schema: {
                type: agw.JsonSchemaType.OBJECT,
                properties: {
                    templateName: {
                        type: agw.JsonSchemaType.STRING,
                    },
                    fieldNames: {
                        type: agw.JsonSchemaType.ARRAY,
                        items: {
                            type: agw.JsonSchemaType.STRING,
                        },
                    },
                },
                required: ['templateName', 'fieldNames'],
            },
        });

        const templatesResource = api.root.addResource('templates');
        const uploadIntegration = new agw.LambdaIntegration(this._upload);
        const listIntegration = new agw.LambdaIntegration(this._list);

        templatesResource.addMethod('POST', uploadIntegration, {
            authorizer: this._authorizer,
            requestValidator: uploadReqValidator,
            requestModels: { 'application/json': uploadReqModel },
        });
        templatesResource.addMethod('GET', listIntegration, { authorizer: this._authorizer });

        const templateResource = templatesResource.addResource('{id}');
        const getMetadataIntegration = new agw.LambdaIntegration(this._templateMetadata);
        templateResource.addMethod('GET', getMetadataIntegration, { authorizer: this._authorizer });
    }
}
