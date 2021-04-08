import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as agw from '@aws-cdk/aws-apigateway';
import * as sqs from '@aws-cdk/aws-sqs';
import { AuthorizationType, IdentitySource } from '@aws-cdk/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import { config } from '../config';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { Database } from '../constructs/database';
import { SESEmailVerifier } from '../constructs/emailVerifier';
import { LogGroup, RetentionDays } from '@aws-cdk/aws-logs';
import { EmailCampaignServiceStack } from '../emailCampaignServiceStack';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import { Duration } from '@aws-cdk/core';
import { SqsEventSource } from '@aws-cdk/aws-lambda-event-sources';

export class EmailService {
    private _apiAuth: NodejsFunction;
    private _authorizer: agw.Authorizer;
    private _execute: lambda.Function;
    private _process: lambda.Function;
    private _processBatch: lambda.Function;
    private _emailQueue: sqs.Queue;
    private _emailDlq: sqs.Queue;

    private readonly _emailApiAuthorizerLambdaName: string;
    private readonly _processSendLambdaName: string;
    private readonly _processBatchSendLambdaName: string;
    private readonly _executeSendLambdaName: string;
    private readonly _emailQueueName: string;
    private readonly _emailQueueDlqName: string;

    private readonly REMOVAL_POLICY: cdk.RemovalPolicy;

    constructor(scope: cdk.Construct, api: agw.RestApi, database: Database, buildEnv: string) {
        this.REMOVAL_POLICY = buildEnv === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN;
        this._emailApiAuthorizerLambdaName = `EmailAPIAuthorizer-${buildEnv}`;
        this._processSendLambdaName = `ProcessSendHandler-${buildEnv}`;
        this._processBatchSendLambdaName = `ProcessBatchSendHandler-${buildEnv}`;
        this._executeSendLambdaName = `ExecuteSendHandler-${buildEnv}`;
        this._emailQueueName = `EmailQueue-${buildEnv}`;
        this._emailQueueDlqName = `EmailDLQ-${buildEnv}`;
        new SESEmailVerifier(scope, 'SESEmailVerify', {
            email: config.ses.VERIFIED_EMAIL_ADDRESS,
        });
        this._initQueues(scope);
        this._initFunctions(scope, database);
        this._initAuth(scope, database);
        this._initPaths(scope, api);
        this._initLogGroups(scope);
    }

    private _initQueues(scope: cdk.Construct) {
        this._emailDlq = new sqs.Queue(scope, 'EmailDLQ', {
            queueName: `${this._emailQueueDlqName}.fifo`,
            fifo: true,
            retentionPeriod: Duration.days(14),
            contentBasedDeduplication: true,
        });
        this._emailQueue = new sqs.Queue(scope, 'EmailQueue', {
            queueName: `${this._emailQueueName}.fifo`,
            fifo: true,
            visibilityTimeout: Duration.seconds(6 * config.sqs.SEND_LAMBDA_TIMEOUT), // recommended timeout is 6 x lambda timeout
            deadLetterQueue: {
                maxReceiveCount: config.sqs.MAX_RECEIVE_COUNT,
                queue: this._emailDlq,
            },
            contentBasedDeduplication: true,
        });
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
                HTML_BUCKET_NAME: database.htmlBucket().bucketName,
                PROCESSED_HTML_PATH: config.s3.PROCESSED_HTML_PATH,
            },
            functionName: this._emailApiAuthorizerLambdaName,
        });
        database.metadataTable().grantReadData(this._apiAuth);
        database.htmlBucket().grantRead(this._apiAuth, `${config.s3.PROCESSED_HTML_PATH}*`); // READ access to HTML bucket
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
        this._process = new NodejsFunction(scope, 'ProcessSendHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambda.LAMBDA_ROOT}/processSend/index.ts`,
            environment: {
                PROCESSED_HTML_PATH: config.s3.PROCESSED_HTML_PATH,
                METADATA_TABLE_NAME: database.metadataTable().tableName,
                HTML_BUCKET_NAME: database.htmlBucket().bucketName,
                EMAIL_QUEUE_URL: this._emailQueue.queueUrl,
                VERIFIED_EMAIL_ADDRESS: config.ses.VERIFIED_EMAIL_ADDRESS,
                SQS_VERSION: config.sqs.VERSION,
            },
            timeout: cdk.Duration.seconds(10),
            functionName: this._processSendLambdaName,
        });
        database.metadataTable().grantReadData(this._process); // READ template metadata table
        database.htmlBucket().grantRead(this._process);
        this._emailQueue.grantSendMessages(this._process);

        this._processBatch = new NodejsFunction(scope, 'ProcessBatchSendHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambda.LAMBDA_ROOT}/processBatchSend/index.ts`,
            environment: {
                EMAIL_QUEUE_URL: this._emailQueue.queueUrl,
                VERIFIED_EMAIL_ADDRESS: config.ses.VERIFIED_EMAIL_ADDRESS,
                SQS_VERSION: config.sqs.VERSION,
            },
            timeout: cdk.Duration.seconds(10),
            functionName: this._processBatchSendLambdaName,
        });
        this._emailQueue.grantSendMessages(this._processBatch);

        this._execute = new NodejsFunction(scope, 'ExecuteSendHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambda.LAMBDA_ROOT}/executeSend/index.ts`,
            environment: {
                SES_VERSION: config.ses.VERSION,
                SQS_VERSION: config.sqs.VERSION,
                EMAIL_QUEUE_URL: this._emailQueue.queueUrl,
                EMAIL_DLQ_URL: this._emailDlq.queueUrl,
                HTML_BUCKET_NAME: database.htmlBucket().bucketName,
                PROCESSED_HTML_PATH: config.s3.PROCESSED_HTML_PATH,
                MAX_SEND_RATE: config.ses.MAX_SEND_RATE.toString(),
            },
            bundling: {
                nodeModules: ['nodemailer', 'linkifyjs'],
            },
            timeout: cdk.Duration.seconds(config.sqs.SEND_LAMBDA_TIMEOUT),
            reservedConcurrentExecutions: config.sqs.MAX_CONCURRENT_SEND_LAMBDA_COUNT,
            functionName: this._executeSendLambdaName,
        });
        database.htmlBucket().grantRead(this._execute, `${config.s3.PROCESSED_HTML_PATH}*`); // READ access to HTML bucket
        this._emailQueue.grantConsumeMessages(this._execute);
        this._emailDlq.grantSendMessages(this._execute);
        this._execute.addEventSource(
            new SqsEventSource(this._emailQueue, {
                batchSize: config.sqs.BATCH_SIZE,
            }),
        );
        this._execute.addToRolePolicy(
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
        const processIntegration = new agw.LambdaIntegration(this._process);
        emailResource.addMethod('POST', processIntegration, {
            requestParameters: {
                'method.request.querystring.templateid': true,
            },
            authorizer: this._authorizer,
            authorizationType: AuthorizationType.CUSTOM,
            requestValidator: emailReqValidator,
            requestModels: { 'application/json': emailReqModel },
        });

        const emailBatchReqModel = new agw.Model(scope, 'SendEmailBatchReqModel', {
            restApi: api,
            contentType: 'application/json',
            description: 'Send batch email request payload',
            schema: {
                type: agw.JsonSchemaType.OBJECT,
                properties: {
                    emails: {
                        type: agw.JsonSchemaType.ARRAY,
                        items: {
                            minItems: 1,
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
                    },
                },
            },
        });

        const emailBatchResource = api.root.addResource('emailBatch');
        const processBatchIntegration = new agw.LambdaIntegration(this._processBatch);
        emailBatchResource.addMethod('POST', processBatchIntegration, {
            requestParameters: {
                'method.request.querystring.templateid': true,
            },
            authorizer: this._authorizer,
            authorizationType: AuthorizationType.CUSTOM,
            requestValidator: emailReqValidator,
            requestModels: { 'application/json': emailBatchReqModel },
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
        new LogGroup(scope, 'ExecuteSendHandlerLogs', {
            logGroupName: EmailCampaignServiceStack.logGroupNamePrefix + this._executeSendLambdaName,
            retention: RetentionDays.SIX_MONTHS,
            removalPolicy: this.REMOVAL_POLICY,
        });
        new LogGroup(scope, 'ProcessSendHandlerLogs', {
            logGroupName: EmailCampaignServiceStack.logGroupNamePrefix + this._processSendLambdaName,
            retention: RetentionDays.SIX_MONTHS,
            removalPolicy: this.REMOVAL_POLICY,
        });
        new LogGroup(scope, 'ProcessBatchSendHandlerLogs', {
            logGroupName: EmailCampaignServiceStack.logGroupNamePrefix + this._processBatchSendLambdaName,
            retention: RetentionDays.SIX_MONTHS,
            removalPolicy: this.REMOVAL_POLICY,
        });
    }
}
