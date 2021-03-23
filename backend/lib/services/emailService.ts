import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as agw from '@aws-cdk/aws-apigateway';
import { AuthorizationType, IdentitySource } from '@aws-cdk/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import { config } from '../config';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { Database } from '../constructs/database';
import { SESEmailVerifier } from '../constructs/emailVerifier';
import { LogGroup, RetentionDays } from '@aws-cdk/aws-logs';
import { EmailCampaignServiceStack } from '../emailCampaignServiceStack';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';

export class EmailService {
    private _apiAuth: NodejsFunction;
    private _authorizer: agw.Authorizer;
    private _send: lambda.Function;

    private readonly _emailApiAuthorizerLambdaName: string;
    private readonly _emailSendLambdaName: string;

    private readonly REMOVAL_POLICY: cdk.RemovalPolicy;

    constructor(scope: cdk.Construct, api: agw.RestApi, database: Database, buildEnv: string) {
        this.REMOVAL_POLICY = buildEnv === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN;
        this._emailApiAuthorizerLambdaName = `EmailAPIAuthorizer-${buildEnv}`;
        this._emailSendLambdaName = `SendEmailHandler-${buildEnv}`;
        new SESEmailVerifier(scope, 'SESEmailVerify', {
            email: config.ses.VERIFIED_EMAIL_ADDRESS,
        });
        this._initFunctions(scope, database);
        this._initAuth(scope, database);
        this._initPaths(scope, api);
        this._initLogGroups(scope);
    }

    private _initAuth(scope: cdk.Construct, database: Database) {
        this._apiAuth = new NodejsFunction(scope, 'EmailAPIAuthorizer', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambda.LAMBDA_ROOT}/emailApiAuth/index.ts`,
            environment: {
                KMS_REGION: config.KMS.REGION,
                KMS_ACCOUNT_ID: config.KMS.ACCOUNT_ID,
                KMS_KEY_ID: config.KMS.KEY_ID,
                METADATA_TABLE_NAME: database.metadataTable().tableName,
            },
            functionName: this._emailApiAuthorizerLambdaName,
        });
        database.metadataTable().grantReadData(this._apiAuth);
        this._apiAuth.addToRolePolicy(
            new PolicyStatement({
                actions: ['kms:Decrypt'],
                resources: [`arn:aws:kms:${config.KMS.REGION}:${config.KMS.ACCOUNT_ID}:key/${config.KMS.KEY_ID}`],
                effect: Effect.ALLOW,
            }),
        );

        this._authorizer = new agw.RequestAuthorizer(scope, 'RequestAuthorizer', {
            handler: this._apiAuth,
            identitySources: [IdentitySource.header('APIKey')],
        });
    }

    private _initFunctions(scope: cdk.Construct, database: Database) {
        this._send = new NodejsFunction(scope, 'SendEmailHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambda.LAMBDA_ROOT}/sendEmail/index.ts`,
            environment: {
                HTML_BUCKET_NAME: database.htmlBucket().bucketName,
                PROCESSED_HTML_PATH: config.s3.PROCESSED_HTML_PATH,
                METADATA_TABLE_NAME: database.metadataTable().tableName,
                VERIFIED_EMAIL_ADDRESS: config.ses.VERIFIED_EMAIL_ADDRESS,
                VERSION: config.ses.VERSION,
            },
            bundling: {
                nodeModules: ['nodemailer'],
            },
            timeout: cdk.Duration.seconds(10),
            functionName: this._emailSendLambdaName,
        });
        database.htmlBucket().grantRead(this._send, `${config.s3.PROCESSED_HTML_PATH}*`); // READ access to HTML bucket
        database.metadataTable().grantReadData(this._send); // READ template metadata table
        this._send.addToRolePolicy(
            new iam.PolicyStatement({
                // SEND permission using SES
                actions: ['ses:SendEmail', 'ses:SendRawEmail'],
                resources: ['*'],
                effect: iam.Effect.ALLOW,
            }),
        );
    }

    /**
     * Define email endpoints
     * All email related (external API) endpoints MUST include the emailAuth authorizer
     * ie. use {authorizer: this._authorizer}
     * */
    private _initPaths(scope: cdk.Construct, api: agw.RestApi): void {
        const emailReqValidator = new agw.RequestValidator(scope, 'SendEmailValidator', {
            restApi: api,
            requestValidatorName: 'SendEmailReqValidator',
            validateRequestBody: true,
            validateRequestParameters: true,
        });
        const emailReqModel = new agw.Model(scope, 'SendEmailReqModel', {
            restApi: api,
            contentType: 'application/json',
            description: 'Send email request payload',
            schema: {
                type: agw.JsonSchemaType.OBJECT,
                properties: {
                    subject: {
                        type: agw.JsonSchemaType.STRING,
                    },
                    recipient: {
                        type: agw.JsonSchemaType.STRING,
                    },
                    fields: {
                        type: agw.JsonSchemaType.OBJECT,
                        additionalProperties: {
                            type: agw.JsonSchemaType.STRING,
                        },
                    },
                },
                required: ['subject', 'recipient', 'fields'],
            },
        });

        const emailResource = api.root.addResource('email');
        const sendIntegration = new agw.LambdaIntegration(this._send);
        emailResource.addMethod('POST', sendIntegration, {
            requestParameters: {
                'method.request.querystring.templateid': true,
            },
            authorizer: this._authorizer,
            authorizationType: AuthorizationType.CUSTOM,
            requestValidator: emailReqValidator,
            requestModels: { 'application/json': emailReqModel },
        });
    }

    /**
     * Initialize lambda log groups to control log retention period
     * Create one log group per lambda handler
     */
    private _initLogGroups(scope: cdk.Construct): void {
        new LogGroup(scope, 'EmailAPIAuthorizerLogs', {
            logGroupName: EmailCampaignServiceStack.logGroupNamePrefix + this._emailApiAuthorizerLambdaName,
            retention: RetentionDays.SIX_MONTHS,
            removalPolicy: this.REMOVAL_POLICY,
        });
        new LogGroup(scope, 'SendEmailHandlerLogs', {
            logGroupName: EmailCampaignServiceStack.logGroupNamePrefix + this._emailSendLambdaName,
            retention: RetentionDays.SIX_MONTHS,
            removalPolicy: this.REMOVAL_POLICY,
        });
    }
}
