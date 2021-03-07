import { Stack } from '@aws-cdk/core';
import { RestApi } from '@aws-cdk/aws-apigateway';
import { Database } from '../../lib/constructs/database';
import { arrayWith, countResources, expect, haveResource, haveResourceLike, objectLike, stringLike } from '@aws-cdk/assert/';
import { config } from '../../lib/config';
import { EmailService } from '../../lib/services/emailService';

let stack: Stack;
let emailService: EmailService;
let api: RestApi;
let database: Database;

beforeAll(() => {
    stack = new Stack();
    api = new RestApi(stack, 'mockApi');
    database = new Database(stack, 'mockDatabase');
    emailService = new EmailService(stack, api, database);
});

describe('email service tests', () => {
    it('creates send, authorizer, identity verifier lambdas', () => {
        expect(stack).to(countResources('AWS::Lambda::Function', 3));
    });

    it('adds email endpoint to API gateway', () => {
        expect(stack).to(
            haveResource('AWS::ApiGateway::Resource', {
                PathPart: 'email',
            }),
        );
        expect(stack).to(
            haveResource('AWS::ApiGateway::Method', {
                HttpMethod: 'POST',
            }),
        );
    });

    describe('send lambda tests', () => {
        it('send lambda has all environment variables', () => {
            expect(stack).to(
                haveResource('AWS::Lambda::Function', {
                    Environment: {
                        Variables: objectLike({
                            HTML_BUCKET_NAME: objectLike({
                                Ref: stringLike('HTMLBucket*'),
                            }),
                            VERIFIED_EMAIL_ADDRESS: config.ses.VERIFIED_EMAIL_ADDRESS,
                            VERSION: config.ses.VERSION,
                        }),
                    },
                    Runtime: 'nodejs12.x',
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
