import { TemplateService } from '../../lib/services/templateService';
import { Stack } from '@aws-cdk/core';
import { RestApi } from '@aws-cdk/aws-apigateway';
import { Database } from '../../lib/constructs/database';
import { arrayWith, expect, haveResource, haveResourceLike, objectLike, stringLike } from '@aws-cdk/assert/';
import { config } from '../../lib/config';

let stack: Stack;
let api: RestApi;
let database: Database;

beforeAll(() => {
    stack = new Stack();
    api = new RestApi(stack, 'mockApi');
    database = new Database(stack, 'mockDatabase', 'test');
    new TemplateService(stack, api, database, 'test');
});

describe('template service tests', () => {
    it('adds template endpoints to API gateway', () => {
        expect(stack).to(
            haveResource('AWS::ApiGateway::Resource', {
                PathPart: 'templates',
            }),
        );
        expect(stack).to(
            haveResource('AWS::ApiGateway::Method', {
                HttpMethod: 'POST',
                ResourceId: objectLike({
                    Ref: stringLike('*templates*'),
                }),
            }),
        );
        expect(stack).to(
            haveResource('AWS::ApiGateway::Method', {
                HttpMethod: 'GET',
                ResourceId: objectLike({
                    Ref: stringLike('*templates*'),
                }),
            }),
        );
        expect(stack).to(
            haveResource('AWS::ApiGateway::Method', {
                HttpMethod: 'DELETE',
                ResourceId: objectLike({
                    Ref: stringLike('*templates*'),
                }),
            }),
        );
        expect(stack).to(
            haveResource('AWS::ApiGateway::Method', {
                HttpMethod: 'PUT',
                ResourceId: objectLike({
                    Ref: stringLike('*templates*'),
                }),
            }),
        );
    });

    it('adds template/id endpoints to API gateway', () => {
        expect(stack).to(
            haveResource('AWS::ApiGateway::Resource', {
                PathPart: '{id}',
                ParentId: objectLike({
                    Ref: stringLike('*templates*'),
                }),
            }),
        );
        expect(stack).to(
            haveResource('AWS::ApiGateway::Method', {
                HttpMethod: 'GET',
                ResourceId: objectLike({
                    Ref: stringLike('*templatesid*'),
                }),
            }),
        );
        expect(stack).to(
            haveResource('AWS::ApiGateway::Method', {
                HttpMethod: 'DELETE',
                ResourceId: objectLike({
                    Ref: stringLike('*templatesid*'),
                }),
            }),
        );
        expect(stack).to(
            haveResource('AWS::ApiGateway::Method', {
                HttpMethod: 'PUT',
                ResourceId: objectLike({
                    Ref: stringLike('*templatesid*'),
                }),
            }),
        );
    });

    it('adds template/logs/id endpoints to API gateway', () => {
        expect(stack).to(
            haveResource('AWS::ApiGateway::Resource', {
                PathPart: 'logs',
                ParentId: objectLike({
                    Ref: stringLike('*templates*'),
                }),
            }),
        );
        expect(stack).to(
            haveResource('AWS::ApiGateway::Resource', {
                PathPart: '{id}',
                ParentId: objectLike({
                    Ref: stringLike('*templateslogs*'),
                }),
            }),
        );
        expect(stack).to(
            haveResource('AWS::ApiGateway::Method', {
                HttpMethod: 'GET',
                ResourceId: objectLike({
                    Ref: stringLike('*templateslogsid*'),
                }),
            }),
        );
    });

    it('creates template endpoint cognito authorizer', () => {
        expect(stack).to(
            haveResource('AWS::ApiGateway::Authorizer', {
                IdentitySource: 'method.request.header.Authorization',
                Type: 'COGNITO_USER_POOLS',
            }),
        );
        expect(stack).to(
            haveResource('AWS::ApiGateway::Method', {
                AuthorizationType: 'COGNITO_USER_POOLS',
                AuthorizerId: objectLike({
                    Ref: stringLike('TemplateAuthorizer*'),
                }),
            }),
        );
    });

    describe('upload template lambda tests', () => {
        it('upload lambda has all environment variables', () => {
            expect(stack).to(
                haveResource('AWS::Lambda::Function', {
                    Environment: {
                        Variables: objectLike({
                            DYNAMO_API_VERSION: config.dynamo.apiVersion,
                            HTML_BUCKET_NAME: objectLike({
                                Ref: stringLike('HTMLBucket*'),
                            }),
                            SRC_HTML_PATH: config.s3.SRC_HTML_PATH,
                            METADATA_TABLE_NAME: objectLike({
                                Ref: stringLike('MetadataTable*'),
                            }),
                            PRESIGNED_URL_EXPIRY: config.s3.PRESIGNED_URL_EXPIRY,
                            KMS_ACCOUNT_ID: config.KMS.ACCOUNT_ID,
                            KMS_KEY_ID: config.KMS.KEY_ID,
                            KMS_REGION: config.KMS.REGION,
                        }),
                    },
                    Runtime: 'nodejs12.x',
                    FunctionName: stringLike('UploadTemplateHandler*'),
                }),
            );
        });

        it('has PUT permission on HTML bucket', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith('s3:PutObject*'),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('UploadTemplateHandler*'),
                }),
            );
        });

        it('has READ/WRITE permission on Metadata table', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith(
                                    'dynamodb:Query',
                                    'dynamodb:GetItem',
                                    'dynamodb:Scan',
                                    'dynamodb:ConditionCheckItem',
                                    'dynamodb:PutItem',
                                    'dynamodb:UpdateItem',
                                    'dynamodb:DeleteItem',
                                ),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('UploadTemplateHandler*'),
                }),
            );
        });

        it('can encrypt with kms key', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: 'kms:Encrypt',
                                Effect: 'Allow',
                                Resource: stringLike(`arn:aws:kms:${config.KMS.REGION}:${config.KMS.ACCOUNT_ID}:key/${config.KMS.KEY_ID}`),
                            }),
                        ),
                    }),
                    PolicyName: stringLike('UploadTemplateHandler*'),
                }),
            );
        });
    });

    describe('list template lambda tests', () => {
        it('list lambda has all environment variables', () => {
            expect(stack).to(
                haveResource('AWS::Lambda::Function', {
                    Environment: {
                        Variables: objectLike({
                            DYNAMO_API_VERSION: config.dynamo.apiVersion,
                            METADATA_TABLE_NAME: objectLike({
                                Ref: stringLike('MetadataTable*'),
                            }),
                        }),
                    },
                    Runtime: 'nodejs12.x',
                    FunctionName: stringLike('ListTemplatesHandler*'),
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
                    PolicyName: stringLike('ListTemplatesHandler*'),
                }),
            );
        });
    });

    describe('get template metadata lambda tests', () => {
        it('get template metadata lambda has all environment variables', () => {
            expect(stack).to(
                haveResource('AWS::Lambda::Function', {
                    Environment: {
                        Variables: objectLike({
                            DYNAMO_API_VERSION: config.dynamo.apiVersion,
                            METADATA_TABLE_NAME: objectLike({
                                Ref: stringLike('MetadataTable*'),
                            }),
                            PROCESSED_HTML_PATH: config.s3.PROCESSED_HTML_PATH,
                            HTML_BUCKET_NAME: objectLike({
                                Ref: stringLike('HTMLBucket*'),
                            }),
                        }),
                    },
                    Runtime: 'nodejs12.x',
                    FunctionName: stringLike('GetTemplateMetadataHandler*'),
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
                    PolicyName: stringLike('GetTemplateMetadataHandler*'),
                }),
            );
        });

        it('has READ permission on HTML bucket', () => {
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
                    PolicyName: stringLike('GetTemplateMetadataHandler*'),
                }),
            );
        });
    });

    describe('delete template lambda tests', () => {
        it('delete lambda has all environment variables', () => {
            expect(stack).to(
                haveResource('AWS::Lambda::Function', {
                    Environment: {
                        Variables: objectLike({
                            DYNAMO_API_VERSION: config.dynamo.apiVersion,
                            METADATA_TABLE_NAME: objectLike({
                                Ref: stringLike('MetadataTable*'),
                            }),
                            HTML_BUCKET_NAME: objectLike({
                                Ref: stringLike('HTMLBucket*'),
                            }),
                            PROCESSED_HTML_PATH: config.s3.PROCESSED_HTML_PATH,
                        }),
                    },
                    Runtime: 'nodejs12.x',
                    FunctionName: stringLike('DeleteTemplateHandler*'),
                }),
            );
        });

        it('has READ/WRITE permission on Metadata table', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith(
                                    'dynamodb:Query',
                                    'dynamodb:GetItem',
                                    'dynamodb:Scan',
                                    'dynamodb:ConditionCheckItem',
                                    'dynamodb:PutItem',
                                    'dynamodb:UpdateItem',
                                    'dynamodb:DeleteItem',
                                ),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('DeleteTemplateHandler*'),
                }),
            );
        });

        it('has READ permission on HTML bucket', () => {
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
                    PolicyName: stringLike('DeleteTemplateHandler*'),
                }),
            );
        });

        it('has DELETE permission on HTML bucket', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: stringLike('s3:DeleteObject*'),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('DeleteTemplateHandler*'),
                }),
            );
        });
    });

    describe('process HTML lambda tests', () => {
        it('process HTML lambda has all environment variables', () => {
            expect(stack).to(
                haveResource('AWS::Lambda::Function', {
                    Environment: {
                        Variables: objectLike({
                            METADATA_TABLE_NAME: objectLike({
                                Ref: stringLike('MetadataTable*'),
                            }),
                            HTML_BUCKET_NAME: objectLike({
                                Ref: stringLike('HTMLBucket*'),
                            }),
                            SRC_HTML_PATH: config.s3.SRC_HTML_PATH,
                            PROCESSED_HTML_PATH: config.s3.PROCESSED_HTML_PATH,
                            IMAGE_BUCKET_NAME: objectLike({
                                Ref: stringLike('ImageBucket*'),
                            }),
                        }),
                    },
                    Runtime: 'nodejs12.x',
                    FunctionName: stringLike('ProcessHTMLHandler*'),
                    Timeout: 10,
                }),
            );
        });

        it('has READ/WRITE permission on Metadata table', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith(
                                    'dynamodb:Query',
                                    'dynamodb:GetItem',
                                    'dynamodb:Scan',
                                    'dynamodb:ConditionCheckItem',
                                    'dynamodb:PutItem',
                                    'dynamodb:UpdateItem',
                                    'dynamodb:DeleteItem',
                                ),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('ProcessHTMLHandler*'),
                }),
            );
        });

        it('has READ/DELETE/PUT permission on HTML bucket', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith('s3:GetObject*', 's3:GetBucket*', 's3:List*'),
                                Effect: 'Allow',
                            }),
                            objectLike({
                                Action: stringLike('s3:DeleteObject*'),
                                Effect: 'Allow',
                                Resource: objectLike({
                                    'Fn::Join': arrayWith(
                                        arrayWith(objectLike({ 'Fn::GetAtt': arrayWith(stringLike('HTMLBucket*')) }), '/src/*'),
                                    ),
                                }),
                            }),
                            objectLike({
                                Action: arrayWith(stringLike('s3:PutObject*')),
                                Effect: 'Allow',
                                Resource: objectLike({
                                    'Fn::Join': arrayWith(
                                        arrayWith(objectLike({ 'Fn::GetAtt': arrayWith(stringLike('HTMLBucket*')) }), '/processed/*'),
                                    ),
                                }),
                            }),
                        ),
                    }),
                    PolicyName: stringLike('ProcessHTMLHandler*'),
                }),
            );
        });

        it('has PUT permission on Image bucket', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith(stringLike('s3:PutObject*')),
                                Effect: 'Allow',
                                Resource: objectLike({
                                    'Fn::Join': arrayWith(arrayWith(objectLike({ 'Fn::GetAtt': arrayWith(stringLike('ImageBucket*')) }))),
                                }),
                            }),
                        ),
                    }),
                    PolicyName: stringLike('ProcessHTMLHandler*'),
                }),
            );
        });
    });

    describe('get template logs lambda tests', () => {
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
                    Timeout: 10,
                    FunctionName: stringLike('GetTemplateLogsHandler*'),
                }),
            );
        });

        it('has READ permission on CloudWatch', () => {
            expect(stack).to(
                haveResourceLike('AWS::IAM::Policy', {
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: arrayWith('logs:GetLogEvents', 'logs:DescribeLogStreams'),
                                Effect: 'Allow',
                            }),
                        ),
                    }),
                    PolicyName: stringLike('GetLogsHandler*'),
                }),
            );
        });
    });

    describe('template service log tests', () => {
        it('has log groups for all service lambdas', () => {
            expect(stack).to(
                haveResourceLike('AWS::Logs::LogGroup', {
                    LogGroupName: stringLike('*UploadTemplateHandler*'),
                    RetentionInDays: 180,
                }),
            );
            expect(stack).to(
                haveResourceLike('AWS::Logs::LogGroup', {
                    LogGroupName: stringLike('*GetTemplateMetadataHandler*'),
                    RetentionInDays: 180,
                }),
            );
            expect(stack).to(
                haveResourceLike('AWS::Logs::LogGroup', {
                    LogGroupName: stringLike('*ListTemplatesHandler*'),
                    RetentionInDays: 180,
                }),
            );
            expect(stack).to(
                haveResourceLike('AWS::Logs::LogGroup', {
                    LogGroupName: stringLike('*DeleteTemplateHandler*'),
                    RetentionInDays: 180,
                }),
            );
            expect(stack).to(
                haveResourceLike('AWS::Logs::LogGroup', {
                    LogGroupName: stringLike('*ProcessHTMLHandler*'),
                    RetentionInDays: 180,
                }),
            );
            expect(stack).to(
                haveResourceLike('AWS::Logs::LogGroup', {
                    LogGroupName: stringLike('*GetTemplateLogsHandler*'),
                    RetentionInDays: 180,
                }),
            );
        });
    });
});
