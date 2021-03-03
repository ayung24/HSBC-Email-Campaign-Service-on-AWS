import { Stack } from '@aws-cdk/core';
import { SESEmailVerifier } from '../../lib/constructs/emailVerifier';
import { countResources, expect, haveResourceLike } from '@aws-cdk/assert';

let stack: Stack;
let verifier: SESEmailVerifier;
const testEmail: string = 'test@example.com';

beforeAll(() => {
    stack = new Stack();
    verifier = new SESEmailVerifier(stack, 'TestEmailVerifier', {
        email: testEmail
    })
})

describe('email verifier tests', () => {
    it ('creates custom resource to verify email', () => {
        expect(stack).to(countResources('Custom::AWS', 1));
    });

    it('has correct Create properties', () => {
        expect(stack).to(haveResourceLike('Custom::AWS', {
            Create: {
                service: 'SES',
                action: 'verifyEmailIdentity',
                parameters: {
                    EmailAddress: testEmail,
                },
            },
        }));
    });

    it('has correct Delete properties', () => {
        expect(stack).to(haveResourceLike('Custom::AWS', {
            Delete: {
                service: 'SES',
                action: 'deleteIdentity',
                parameters: {
                    Identity: testEmail,
                },
            },
        }));
    });
})