import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as agw from '@aws-cdk/aws-apigateway';
import { IdentitySource } from '@aws-cdk/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import { config } from '../config';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { Database } from '../constructs/database';
import { SESEmailVerifier } from '../constructs/emailVerifier';
import { LogGroup, RetentionDays } from '@aws-cdk/aws-logs';
import { EmailCampaignServiceStack } from '../emailCampaignServiceStack';

export class EmailService {
    private _apiAuth: NodejsFunction;
    private _authorizer: agw.Authorizer;
    private _send: lambda.Function;

    private readonly _emailApiAuthorizerLambdaName: string;
    private readonly _emailSendLambdaName: string;

    constructor(scope: cdk.Construct, api: agw.RestApi, database: Database, buildEnv: string) {
        this._emailApiAuthorizerLambdaName = `EmailAPIAuthorizer-${buildEnv}`;
        this._emailSendLambdaName = `SendEmailHandler-${buildEnv}`;
        new SESEmailVerifier(scope, 'SESEmailVerify', {
            email: config.ses.VERIFIED_EMAIL_ADDRESS,
        });
        this._initFunctions(scope, database);
        this._initAuth(scope);
        this._initPaths(scope, api);
        this._initLogGroups(scope);
    }

    private _initAuth(scope: cdk.Construct) {
        this._apiAuth = new NodejsFunction(scope, 'EmailAPIAuthorizer', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambda.LAMBDA_ROOT}/emailApiAuth/index.ts`,
            functionName: this._emailApiAuthorizerLambdaName,
            bundling: {
                nodeModules: ['cryptr'],
            },
        });

        this._authorizer = new agw.RequestAuthorizer(scope, 'RequestAuthorizer', {
            handler: this._apiAuth,
            identitySources: [IdentitySource.header('Authorization')],
        });
    }

    private _initFunctions(scope: cdk.Construct, database: Database) {
        this._send = new NodejsFunction(scope, 'SendEmailHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambda.LAMBDA_ROOT}/sendEmail/index.ts`,
            environment: {
                HTML_BUCKET_NAME: database.htmlBucket().bucketName,
                METADATA_TABLE_NAME: database.metadataTable().tableName,
                VERIFIED_EMAIL_ADDRESS: config.ses.VERIFIED_EMAIL_ADDRESS,
                VERSION: config.ses.VERSION,
            },
            bundling: {
                nodeModules: ['nodemailer'],
            },
            functionName: this._emailSendLambdaName,
        });
        database.htmlBucket().grantRead(this._send); // READ access to HTML bucket
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
        const emailApiAuthReqValidator = new agw.RequestValidator(scope, 'EmailApiValidator', {
            restApi: api,
            requestValidatorName: 'email-api-auth-req-validator',
            validateRequestBody: true,
            validateRequestParameters: true,
        });

        const emailApiAuthReqModel = new agw.Model(scope, 'EmailApiAuthReqModel', {
            restApi: api,
            contentType: 'application/json',
            description: 'Email api auth request payload',
            schema: {
                type: agw.JsonSchemaType.OBJECT,
                properties: {
                    body: {
                        type: agw.JsonSchemaType.OBJECT,
                        properties: {
                            templateID: {
                                type: agw.JsonSchemaType.STRING,
                            },
                            apiKey: {
                                type: agw.JsonSchemaType.STRING,
                            },
                        },
                    },
                },
                required: ['templateID', 'apiKey'],
            },
        });

        const emailApiAuthResource = api.root.addResource('emailApiAuth');
        const emailApiAuthIntegration = new agw.LambdaIntegration(this._apiAuth);
        emailApiAuthResource.addMethod('POST', emailApiAuthIntegration, {
            authorizer: this._authorizer,
            requestValidator: emailApiAuthReqValidator,
            requestModels: { 'application/json': emailApiAuthReqModel },
        });

        const emailResource = api.root.addResource('email');
        const sendIntegration = new agw.LambdaIntegration(this._send);

        emailResource.addMethod('POST', sendIntegration, { authorizer: this._authorizer });
    }

    /**
     * Initialize lambda log groups to control log retention period
     * Create one log group per lambda handler
     */
    private _initLogGroups(scope: cdk.Construct): void {
        new LogGroup(scope, 'EmailAPIAuthorizerLogs', {
            logGroupName: EmailCampaignServiceStack.logGroupNamePrefix + this._emailApiAuthorizerLambdaName,
            retention: RetentionDays.SIX_MONTHS,
        });
        new LogGroup(scope, 'SendEmailHandlerLogs', {
            logGroupName: EmailCampaignServiceStack.logGroupNamePrefix + this._emailSendLambdaName,
            retention: RetentionDays.SIX_MONTHS,
        });
    }
}
