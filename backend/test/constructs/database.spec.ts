import { Stack } from '@aws-cdk/core';
import { Database } from '../../lib/constructs/database';
import { arrayWith, expect, haveResource, objectLike, stringLike } from '@aws-cdk/assert/';

let stack: Stack;

beforeAll(() => {
    stack = new Stack();
    new Database(stack, 'testDatabase', 'test');
});

describe('database infrastructure tests', () => {
    it('has template metadata DynamoDB table with correct schema', () => {
        expect(stack).to(
            haveResource('AWS::DynamoDB::Table', {
                KeySchema: arrayWith(
                    objectLike({
                        AttributeName: 'templateId',
                    }),
                    objectLike({
                        AttributeName: 'timeCreated',
                    }),
                ),
                AttributeDefinitions: arrayWith(
                    objectLike({
                        AttributeName: 'templateId',
                        AttributeType: 'S',
                    }),
                    objectLike({
                        AttributeName: 'timeCreated',
                        AttributeType: 'N',
                    }),
                    objectLike({
                        AttributeName: 'templateStatus',
                        AttributeType: 'S',
                    }),
                    objectLike({
                        AttributeName: 'templateName',
                        AttributeType: 'S',
                    }),
                ),
                GlobalSecondaryIndexes: arrayWith(
                    objectLike({
                        KeySchema: arrayWith(
                            objectLike({
                                AttributeName: 'templateStatus',
                            }),
                            objectLike({
                                AttributeName: 'templateName',
                            }),
                        ),
                    }),
                    objectLike({
                        KeySchema: arrayWith(
                            objectLike({
                                AttributeName: 'templateStatus',
                            }),
                            objectLike({
                                AttributeName: 'templateId',
                            }),
                        ),
                    }),
                    objectLike({
                        KeySchema: arrayWith(
                            objectLike({
                                AttributeName: 'templateStatus',
                            }),
                            objectLike({
                                AttributeName: 'timeCreated',
                            }),
                        ),
                    }),
                ),
            }),
        );
    });

    describe('S3 HTML bucket tests', () => {
        it('has POST allowed', () => {
            expect(stack).to(
                haveResource('AWS::S3::Bucket', {
                    CorsConfiguration: objectLike({
                        CorsRules: arrayWith(
                            objectLike({
                                AllowedMethods: arrayWith('POST'),
                            }),
                        ),
                    }),
                }),
            );
        });

        it('blocks public access', () => {
            expect(stack).to(
                haveResource('AWS::S3::Bucket', {
                    PublicAccessBlockConfiguration: objectLike({
                        BlockPublicAcls: true,
                        BlockPublicPolicy: true,
                        IgnorePublicAcls: true,
                        RestrictPublicBuckets: true,
                    }),
                }),
            );
        });
    });

    describe('S3 Image bucket tests', () => {
        it('has public read access policy', () => {
            expect(stack).to(
                haveResource('AWS::S3::Bucket', {
                    AccessControl: 'PublicRead',
                }),
            );
        });

        it('has public get bucket policy', () => {
            expect(stack).to(
                haveResource('AWS::S3::BucketPolicy', {
                    Bucket: objectLike({
                        Ref: stringLike('ImageBucket*'),
                    }),
                    PolicyDocument: objectLike({
                        Statement: arrayWith(
                            objectLike({
                                Action: 's3:GetObject',
                                Effect: 'Allow',
                                Principal: '*',
                            }),
                        ),
                    }),
                }),
            );
        });
    });
});
