import { Stack } from '@aws-cdk/core';
import { RestApi } from '@aws-cdk/aws-apigateway';
import { Database } from '../../lib/constructs/database';
import { arrayWith, expect, haveResource, haveResourceLike, objectLike, stringLike } from '@aws-cdk/assert/';
import { config } from '../../lib/config';
import { EmailService } from '../../lib/services/emailService';

let stack: Stack;
let api: RestApi;
let database: Database;

beforeAll(() => {
    stack = new Stack();
    api = new RestApi(stack, 'mockApi');
    database = new Database(stack, 'mockDatabase', 'test');
    new EmailService(stack, api, database, 'test');
});

describe('email service tests', () => {
    it('adds email endpoint to API gateway with correct authorization type and query param', () => {
        expect(stack).to(
            haveResource('AWS::ApiGateway::Resource', {
                PathPart: 'email',
            }),
        );
        expect(stack).to(
            haveResource('AWS::ApiGateway::Method', {
                HttpMethod: 'POST',
                AuthorizationType: 'CUSTOM',
                RequestParameters: {
                    'method.request.querystring.templateid': true,
                },
            }),
        );
    });

    it('adds email batch endpoint to API gateway with correct authorization type and query param', () => {
        expect(stack).to(
            haveResource('AWS::ApiGateway::Resource', {
                PathPart: 'emailBatch',
            }),
        );
        expect(stack).to(
            haveResource('AWS::ApiGateway::Method', {
                HttpMethod: 'POST',
                AuthorizationType: 'CUSTOM',
                RequestParameters: {
                    'method.request.querystring.templateid': true,
                },
            }),
        );
    });

    it('has request authorizer with correct identity sources', () => {
        expect(stack).to(
            haveResource('AWS::ApiGateway::Authorizer', {
                IdentitySource: 'method.request.header.APIKey',
            }),
        );
    });

    describe('email api authorizer lambda tests', () => {
        it('has all enviornment variables', () => {
            expect(stack).to(
                haveResource('AWS::Lambda::Function', {
                    Environment: {
                        Variables: objectLike({
                            KMS_REGION: config.KMS.REGION,
                            KMS_ACCOUNT_ID: config.KMS.ACCOUNT_ID,
                            KMS_KEY_ID: config.KMS.KEY_ID,
                            METADATA_TABLE_NAME: objectLike({
                                Ref: stringLike('MetadataTable*'),
                            }),
                            HTML_BUCKET_NAME: objectLike({
                                Ref: stringLike('HTMLBucket*'),
                            }),
                            PROCESSED_HTML_PATH: config.s3.PROCESSED_HTML_PATH,
                        }),
                    },
                    FunctionName: stringLike('EmailAPIAuthorizer*'),
                }),
            );
        });

        it('has READ permission on metadata table', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith('dynamodb:GetItem'),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('EmailAPIAuthorizer*'),
                }),
            );
        });

        it('has READ permission on HTML processed table', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith('s3:GetObject*', 's3:GetBucket*', 's3:List*'),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('EmailAPIAuthorizer*'),
                }),
            );
        });

        it('can decrypt with kms key', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: 'kms:Decrypt',
                                Effect: 'Allow',
                                Resource: stringLike(`arn:aws:kms:${config.KMS.REGION}:${config.KMS.ACCOUNT_ID}:key/${config.KMS.KEY_ID}`),
                            }),
                        ),
                    }),
                    PolicyName: stringLike('EmailAPIAuthorizer*'),
                }),
            );
        });
    });

    describe('email queue tests', () => {
        it('has a SQS FIFO Email queue', () => {
            expect(stack).to(
                haveResourceLike('AWS::SQS::Queue', {
                    QueueName: stringLike('EmailQueue*'),
                    FifoQueue: true,
                    ContentBasedDeduplication: true,
                }),
            );
        });

        it('has correct redrive policy and visibility timeout', () => {
            expect(stack).to(
                haveResourceLike('AWS::SQS::Queue', {
                    QueueName: stringLike('EmailQueue*'),
                    RedrivePolicy: objectLike({
                        deadLetterTargetArn: objectLike({
                            'Fn::GetAtt': arrayWith(stringLike('EmailDLQ*')),
                        }),
                        maxReceiveCount: config.sqs.MAX_RECEIVE_COUNT,
                    }),
                    VisibilityTimeout: 6 * config.sqs.SEND_LAMBDA_TIMEOUT,
                }),
            );
        });

        it('has event source mapping to execute send lambda', () => {
            expect(stack).to(
                haveResourceLike('AWS::Lambda::EventSourceMapping', {
                    FunctionName: objectLike({
                        Ref: stringLike('ExecuteSendHandler*'),
                    }),
                    BatchSize: config.sqs.BATCH_SIZE,
                    EventSourceArn: objectLike({
                        'Fn::GetAtt': arrayWith(stringLike('EmailQueue*')),
                    }),
                }),
            );
        });
    });

    describe('process send lambda tests', () => {
        it('has all environment variables', () => {
            expect(stack).to(
                haveResource('AWS::Lambda::Function', {
                    Environment: {
                        Variables: objectLike({
                            HTML_BUCKET_NAME: objectLike({
                                Ref: stringLike('HTMLBucket*'),
                            }),
                            METADATA_TABLE_NAME: objectLike({
                                Ref: stringLike('MetadataTable*'),
                            }),
                            PROCESSED_HTML_PATH: config.s3.PROCESSED_HTML_PATH,
                            VERIFIED_EMAIL_ADDRESS: config.ses.VERIFIED_EMAIL_ADDRESS,
                            EMAIL_QUEUE_URL: objectLike({
                                Ref: stringLike('EmailQueue*'),
                            }),
                            SQS_VERSION: config.sqs.VERSION,
                        }),
                    },
                    Runtime: 'nodejs12.x',
                    Timeout: 10,
                    FunctionName: stringLike('ProcessSendHandler*'),
                }),
            );
        });

        it('has READ permission on HTML bucket', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith('s3:GetBucket*', 's3:GetObject*'),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('ProcessSendHandler*'),
                }),
            );
        });

        it('has READ permission on Metadata table', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith('dynamodb:Query', 'dynamodb:GetItem', 'dynamodb:Scan', 'dynamodb:ConditionCheckItem'),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('ProcessSendHandler*'),
                }),
            );
        });

        it('has SendMessage permission on Email queue', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith('sqs:SendMessage'),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('ProcessSendHandler*'),
                }),
            );
        });
    });

    describe('process batch send lambda tests', () => {
        it('has all environment variables', () => {
            expect(stack).to(
                haveResource('AWS::Lambda::Function', {
                    Environment: {
                        Variables: objectLike({
                            VERIFIED_EMAIL_ADDRESS: config.ses.VERIFIED_EMAIL_ADDRESS,
                            EMAIL_QUEUE_URL: objectLike({
                                Ref: stringLike('EmailQueue*'),
                            }),
                            SQS_VERSION: config.sqs.VERSION,
                        }),
                    },
                    Runtime: 'nodejs12.x',
                    Timeout: 10,
                    FunctionName: stringLike('ProcessBatchSendHandler*'),
                }),
            );
        });

        it('has SendMessage permission on Email queue', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith('sqs:SendMessage'),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('ProcessBatchSendHandler*'),
                }),
            );
        });
    });

    describe('execute send lambda tests', () => {
        it('has all environment variables', () => {
            expect(stack).to(
                haveResource('AWS::Lambda::Function', {
                    Environment: {
                        Variables: objectLike({
                            HTML_BUCKET_NAME: objectLike({
                                Ref: stringLike('HTMLBucket*'),
                            }),
                            PROCESSED_HTML_PATH: config.s3.PROCESSED_HTML_PATH,
                            EMAIL_QUEUE_URL: objectLike({
                                Ref: stringLike('EmailQueue*'),
                            }),
                            EMAIL_DLQ_URL: objectLike({
                                Ref: stringLike('EmailDLQ*'),
                            }),
                            MAX_SEND_RATE: config.ses.MAX_SEND_RATE.toString(),
                            SES_VERSION: config.ses.VERSION,
                            SQS_VERSION: config.sqs.VERSION,
                        }),
                    },
                    Runtime: 'nodejs12.x',
                    Timeout: config.sqs.SEND_LAMBDA_TIMEOUT,
                    ReservedConcurrentExecutions: config.sqs.MAX_CONCURRENT_SEND_LAMBDA_COUNT,
                    FunctionName: stringLike('ExecuteSendHandler*'),
                }),
            );
        });

        it('has READ permission on HTML bucket', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith('s3:GetBucket*', 's3:GetObject*'),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('ProcessSendHandler*'),
                }),
            );
        });

        it('has Receive and DeleteMessage permission on Email queue', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith('sqs:ReceiveMessage', 'sqs:DeleteMessage'),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('ExecuteSendHandler*'),
                }),
            );
        });

        it('has SendMessage permission on Email DLQ', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith('sqs:SendMessage'),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('ExecuteSendHandler*'),
                }),
            );
        });

        it('has SendEmail, SendRawEmail permission', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith('ses:SendEmail', 'ses:SendRawEmail'),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('ExecuteSendHandler*'),
                }),
            );
        });
    });

    describe('log SNS lambda tests', () => {
        it('has all environment variables', () => {
            expect(stack).to(
                haveResource('AWS::Lambda::Function', {
                    Environment: {
                        Variables: objectLike({
                            EMAIL_EVENTS_LOG_GROUP_NAME: stringLike('EmailEventLogs*'),
                            CLOUDWATCH_VERSION: config.cloudWatch.VERSION,
                        }),
                    },
                    Runtime: 'nodejs12.x',
                    Timeout: 3 * config.sqs.SEND_LAMBDA_TIMEOUT,
                    FunctionName: stringLike('LogSnsHandler*'),
                }),
            );
        });

        it('has CREATE permission on CloudWatch', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith('logs:DescribeLogStreams', 'logs:PutLogEvents', 'logs:CreateLogStream'),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('LogSnsHandler*'),
                }),
            );
        });
    });

    describe('SES configuration set lambda tests', () => {
        it('has all environment variables', () => {
            expect(stack).to(
                haveResource('AWS::Lambda::Function', {
                    Environment: {
                        Variables: objectLike({
                            SES_VERSION: config.ses.VERSION,
                        }),
                    },
                    Runtime: 'nodejs12.x',
                    Timeout: 60,
                    FunctionName: stringLike('SESConfigurationSet*'),
                }),
            );
        });

        it('has CREATE and DELETE permission on SES configuration set', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith('ses:CreateConfigurationSet', 'ses:DeleteConfigurationSet'),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('SESConfigurationSetHandler*'),
                }),
            );
        });

        it('has CREATE, UPDATE, and DELETE permission on SES event destination', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith(
                                    'ses:CreateConfigurationSetEventDestination',
                                    'ses:UpdateConfigurationSetEventDestination',
                                    'ses:DeleteConfigurationSetEventDestination',
                                ),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('SESConfigurationSetHandler*'),
                }),
            );
        });
    });

    describe('email service log tests', () => {
        it('has log groups for all service lambdas', () => {
            expect(stack).to(
                haveResourceLike('AWS::Logs::LogGroup', {
                    LogGroupName: stringLike('*EmailAPIAuthorizer*'),
                    RetentionInDays: 180,
                }),
            );
            expect(stack).to(
                haveResourceLike('AWS::Logs::LogGroup', {
                    LogGroupName: stringLike('*ProcessSendHandler*'),
                    RetentionInDays: 180,
                }),
            );
            expect(stack).to(
                haveResourceLike('AWS::Logs::LogGroup', {
                    LogGroupName: stringLike('*ProcessBatchSendHandler*'),
                    RetentionInDays: 180,
                }),
            );
            expect(stack).to(
                haveResourceLike('AWS::Logs::LogGroup', {
                    LogGroupName: stringLike('*ExecuteSendHandler*'),
                    RetentionInDays: 180,
                }),
            );
            expect(stack).to(
                haveResourceLike('AWS::Logs::LogGroup', {
                    LogGroupName: stringLike('*LogSnsHandler*'),
                    RetentionInDays: 180,
                }),
            );
            expect(stack).to(
                haveResourceLike('AWS::Logs::LogGroup', {
                    LogGroupName: stringLike('*SESConfigurationSet*'),
                    RetentionInDays: 180,
                }),
            );
            expect(stack).to(
                haveResourceLike('AWS::Logs::LogGroup', {
                    LogGroupName: stringLike('*EmailEventLogs*'),
                    RetentionInDays: 180,
                }),
            );
        });
    });
});
