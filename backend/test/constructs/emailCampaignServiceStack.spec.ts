import { App, Stack } from '@aws-cdk/core';
import { expect, haveResourceLike, stringLike } from '@aws-cdk/assert/';
import { EmailCampaignServiceStack } from '../../lib/emailCampaignServiceStack';

let stack: Stack;
let app: App;

beforeAll(() => {
    app = new App();
    stack = new EmailCampaignServiceStack(app, 'EmailCampaignServiceStack');
});

describe('EmailCampaignService stack tests', () => {
    describe('service log tests', () => {
        it('has log in/out log groups', () => {
            expect(stack).to(
                haveResourceLike('AWS::Logs::LogGroup', {
                    LogGroupName: stringLike('*Login*'),
                    RetentionInDays: 180,
                }),
            );
            expect(stack).to(
                haveResourceLike('AWS::Logs::LogGroup', {
                    LogGroupName: stringLike('*Logout*'),
                    RetentionInDays: 180,
                }),
            );
        });
    });
});
