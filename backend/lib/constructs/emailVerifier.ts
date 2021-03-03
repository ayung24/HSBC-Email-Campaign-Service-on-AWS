import { Effect } from '@aws-cdk/aws-iam';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import { AwsCustomResource, PhysicalResourceId, AwsCustomResourcePolicy } from '@aws-cdk/custom-resources';

export interface SESEmailVerifierProps {
    email: string;
}

/**
 * SES Email Verifier construct
 * A custom AWS resource for verifying email addresses through CDK
 * Verified identity will be removed from SES upon CDK destroy
 */
export class SESEmailVerifier extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: SESEmailVerifierProps) {
        super(scope, id);
        const email = props.email;
        new AwsCustomResource(this, `EmailVerifier-${email}`, {
            onCreate: {
                service: 'SES',
                action: 'verifyEmailIdentity',
                parameters: {
                    EmailAddress: email,
                },
                physicalResourceId: PhysicalResourceId.of(`verify-${email}`),
            },
            onDelete: {
                service: 'SES',
                action: 'deleteIdentity',
                parameters: {
                    Identity: email,
                },
            },
            policy: this._createSESPolicy(['ses:VerifyEmailIdentity', 'ses:DeleteIdentity']),
        });
    }

    private _createSESPolicy(methods: string[]): AwsCustomResourcePolicy {
        return AwsCustomResourcePolicy.fromStatements([
            new PolicyStatement({
                actions: methods,
                effect: Effect.ALLOW,
                resources: ['*'],
            }),
        ]);
    }
}
