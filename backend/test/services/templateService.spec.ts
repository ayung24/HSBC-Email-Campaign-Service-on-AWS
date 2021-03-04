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
    database = new Database(stack, 'mockDatabase');
    templateService = new TemplateService(stack, api, database);
});

describe('template service tests', () => {
    it('creates upload and list lambda functions', () => {
        expect(stack).to(countResources('AWS::Lambda::Function', 3));
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
                            METADATA_TABLE_NAME: objectLike({
                                Ref: stringLike('MetadataTable*'),
                            }),
                            PRESIGNED_URL_EXPIRY: config.s3.PRESIGNED_URL_EXPIRY,
                            KMS_KEY_KD: config.KMS.KEY_ID,
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
});
