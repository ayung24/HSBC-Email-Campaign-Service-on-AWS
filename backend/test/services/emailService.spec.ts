import { Stack } from '@aws-cdk/core';
import { RestApi } from '@aws-cdk/aws-apigateway';
import { Database } from '../../lib/constructs/database';
import { arrayWith, expect, haveResource, haveResourceLike, objectLike, stringLike } from '@aws-cdk/assert/';
import { config } from '../../lib/config';
import { EmailService } from '../../lib/services/emailService';

let stack: Stack;
let emailService: EmailService;
let api: RestApi;
let database: Database;

beforeAll(() => {
    stack = new Stack();
    api = new RestApi(stack, 'mockApi');
    database = new Database(stack, 'mockDatabase', 'test');
    emailService = new EmailService(stack, api, database, 'test');
});

describe('email service tests', () => {
    it('adds email endpoint to API gateway with CUSTOM authorization type', () => {
        expect(stack).to(
            haveResource('AWS::ApiGateway::Resource', {
                PathPart: 'email',
            }),
        );
        expect(stack).to(
            haveResource('AWS::ApiGateway::Method', {
                HttpMethod: 'POST',
                AuthorizationType: 'CUSTOM',
            }),
        );
    });

    it('has request authorizer with correct identity sources', () => {
        expect(stack).to(
            haveResource('AWS::ApiGateway::Authorizer', {
                IdentitySource: 'method.request.header.TemplateId,method.request.header.APIKey',
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

    describe('send lambda tests', () => {
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
                            VERSION: config.ses.VERSION,
                        }),
                    },
                    Runtime: 'nodejs12.x',
                    Timeout: 10,
                    FunctionName: stringLike('SendEmailHandler*'),
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
                    PolicyName: stringLike('SendEmailHandler*'),
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
                    PolicyName: stringLike('SendEmailHandler*'),
                }),
            );
        });
    });
});
