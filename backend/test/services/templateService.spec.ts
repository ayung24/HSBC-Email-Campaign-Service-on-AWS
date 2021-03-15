import { TemplateService } from '../../lib/services/templateService';
import { Stack } from '@aws-cdk/core';
import { RestApi } from '@aws-cdk/aws-apigateway';
import { Database } from '../../lib/constructs/database';
import { arrayWith, countResources, expect, haveResource, haveResourceLike, objectLike, stringLike } from '@aws-cdk/assert/';
import { config } from '../../lib/config';

let stack: Stack;
let templateService: TemplateService;
let api: RestApi;
let database: Database;
beforeAll(() => {
    stack = new Stack();
    api = new RestApi(stack, 'mockApi');
    database = new Database(stack, 'mockDatabase', 'test');
    templateService = new TemplateService(stack, api, database, 'test');
});

describe('template service tests', () => {
    it('creates upload, list, get, delete lambda functions', () => {
        // TODO: assert with actual functionNames of lambda instead of counting
        expect(stack).to(countResources('AWS::Lambda::Function', 7));
    });

    it('adds template endpoints to API gateway', () => {
        expect(stack).to(
            haveResource('AWS::ApiGateway::Resource', {
                PathPart: 'templates',
            }),
        );
        expect(stack).to(
            haveResource('AWS::ApiGateway::Method', {
                HttpMethod: 'POST',
            }),
        );
        expect(stack).to(
            haveResource('AWS::ApiGateway::Method', {
                HttpMethod: 'GET',
            }),
        );
        expect(stack).to(
            haveResource('AWS::ApiGateway::Method', {
                HttpMethod: 'DELETE',
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
                        }),
                    },
                    Runtime: 'nodejs12.x',
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
});
