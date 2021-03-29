import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as agw from '@aws-cdk/aws-apigateway';
import { CognitoUserPoolsAuthorizer } from '@aws-cdk/aws-apigateway';

import { UserPool } from '@aws-cdk/aws-cognito';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { config } from '../config';
import { Database } from '../constructs/database';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import { EmailCampaignServiceStack } from '../emailCampaignServiceStack';
import { LogGroup, RetentionDays } from '@aws-cdk/aws-logs';

export class TemplateService {
    private _upload: lambda.Function;
    private _list: lambda.Function;
    private _templateMetadata: lambda.Function;
    private _authorizer: CognitoUserPoolsAuthorizer;
    private _delete: lambda.Function;

    private readonly _uploadTemplateLambdaName: string;
    private readonly _getTemplateMetadataLambdaName: string;
    private readonly _listTemplatesLambdaName: string;
    private readonly _deleteTemplateLambdaName: string;

    private readonly REMOVAL_POLICY: cdk.RemovalPolicy;

    constructor(scope: cdk.Construct, api: agw.RestApi, database: Database, buildEnv: string) {
        this.REMOVAL_POLICY = buildEnv === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN;
        this._uploadTemplateLambdaName = `UploadTemplateHandler-${buildEnv}`;
        this._getTemplateMetadataLambdaName = `GetTemplateMetadataHandler-${buildEnv}`;
        this._listTemplatesLambdaName = `ListTemplatesHandler-${buildEnv}`;
        this._deleteTemplateLambdaName = `DeleteTemplateHandler-${buildEnv}`;
        this._initFunctions(scope, database);
        this._initAuth(scope);
        this._initPaths(scope, api);
        this._initLogGroups(scope);
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
                SRC_HTML_PATH: config.s3.SRC_HTML_PATH,
                PRESIGNED_URL_EXPIRY: config.s3.PRESIGNED_URL_EXPIRY,
                DYNAMO_API_VERSION: config.dynamo.apiVersion,
                KMS_REGION: config.KMS.REGION,
                KMS_ACCOUNT_ID: config.KMS.ACCOUNT_ID,
                KMS_KEY_ID: config.KMS.KEY_ID,
            },
            functionName: this._uploadTemplateLambdaName,
        });
        // configure upload template lambda permissions
        database.htmlBucket().grantPut(this._upload, `${config.s3.SRC_HTML_PATH}*`); // PUT in HTML bucket
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
                PROCESSED_HTML_PATH: config.s3.PROCESSED_HTML_PATH,
                HTML_BUCKET_NAME: database.htmlBucket().bucketName,
            },
            functionName: this._getTemplateMetadataLambdaName,
        });
        database.metadataTable().grantReadData(this._templateMetadata);
        database.htmlBucket().grantRead(this._templateMetadata, `${config.s3.PROCESSED_HTML_PATH}*`);

        this._list = new NodejsFunction(scope, 'ListTemplatesHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambda.LAMBDA_ROOT}/listTemplates/index.ts`,
            environment: {
                METADATA_TABLE_NAME: database.metadataTable().tableName,
                DYNAMO_API_VERSION: config.dynamo.apiVersion,
            },
            functionName: this._listTemplatesLambdaName,
        });
        // configure list templates lambda permissions
        database.metadataTable().grantReadData(this._list); // READ on metadata table

        this._delete = new NodejsFunction(scope, 'DeleteTemplateHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambda.LAMBDA_ROOT}/deleteTemplate/index.ts`,
            environment: {
                METADATA_TABLE_NAME: database.metadataTable().tableName,
                HTML_BUCKET_NAME: database.htmlBucket().bucketName,
                PROCESSED_HTML_PATH: config.s3.PROCESSED_HTML_PATH,
                DYNAMO_API_VERSION: config.dynamo.apiVersion,
            },
            functionName: this._deleteTemplateLambdaName,
        });
        // configure delete templates lambda permissions
        database.metadataTable().grantReadWriteData(this._delete);
        database.htmlBucket().grantRead(this._delete, `${config.s3.PROCESSED_HTML_PATH}*`);
        database.htmlBucket().grantDelete(this._delete, `${config.s3.PROCESSED_HTML_PATH}*`);
    }

    /**
     * Define templates endpoints
     * All template related (internal API) endpoints MUST include the templateAuth authorizer
     * */
    private _initPaths(scope: cdk.Construct, api: agw.RestApi) {
        const uploadReqValidator = new agw.RequestValidator(scope, 'UploadTemplateValidator', {
            restApi: api,
            requestValidatorName: 'UploadTemplateReqValidator',
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
        const deleteIntegration = new agw.LambdaIntegration(this._delete);

        templateResource.addMethod('GET', getMetadataIntegration, { authorizer: this._authorizer });
        templateResource.addMethod('DELETE', deleteIntegration, { authorizer: this._authorizer });
    }

    /**
     * Initialize lambda log groups to control log retention period
     * Create one log group per lambda handler
     */
    private _initLogGroups(scope: cdk.Construct): void {
        new LogGroup(scope, 'UploadTemplateHandlerLogs', {
            logGroupName: EmailCampaignServiceStack.logGroupNamePrefix + this._uploadTemplateLambdaName,
            retention: RetentionDays.SIX_MONTHS,
            removalPolicy: this.REMOVAL_POLICY,
        });
        new LogGroup(scope, 'GetTemplateMetadataHandlerLogs', {
            logGroupName: EmailCampaignServiceStack.logGroupNamePrefix + this._getTemplateMetadataLambdaName,
            retention: RetentionDays.SIX_MONTHS,
            removalPolicy: this.REMOVAL_POLICY,
        });
        new LogGroup(scope, 'ListTemplatesHandlerLogs', {
            logGroupName: EmailCampaignServiceStack.logGroupNamePrefix + this._listTemplatesLambdaName,
            retention: RetentionDays.SIX_MONTHS,
            removalPolicy: this.REMOVAL_POLICY,
        });
        new LogGroup(scope, 'DeleteTemplateHandlerLogs', {
            logGroupName: EmailCampaignServiceStack.logGroupNamePrefix + this._deleteTemplateLambdaName,
            retention: RetentionDays.SIX_MONTHS,
            removalPolicy: this.REMOVAL_POLICY,
        });
    }
}
