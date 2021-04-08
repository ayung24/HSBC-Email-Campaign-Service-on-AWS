/**
 * Taken from CDK SES Template Mailer
 * https://github.com/mkrn/cdk-ses-template-mailer
 * Could not just install and use the library because their library contained a bug which is manually fixed by us
 * Also included extended functionality by Team Make Bank
 */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cfn from '@aws-cdk/aws-cloudformation';
import * as iam from '@aws-cdk/aws-iam';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { config } from '../config';

export interface SESConfigurationSetProps {
    ConfigurationSetName: string;
    TopicARN: string;
    MatchingEventTypes: Array<string>;
    EventDestinationName: string;
}

export class SESConfigurationSet extends cdk.Construct {
    private readonly _sesConfigurationSetLambdaName: string;

    public readonly response: string;

    constructor(scope: cdk.Construct, id: string, props: SESConfigurationSetProps, buildEnv: string) {
        super(scope, id);
        this._sesConfigurationSetLambdaName = `SESConfigurationSet-${buildEnv}`;

        const resolver = new NodejsFunction(scope, 'SESConfigurationSetHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambda.LAMBDA_ROOT}/sesConfigurationSet/index.ts`,
            environment: { SES_VERSION: config.ses.VERSION },
            timeout: cdk.Duration.seconds(60),
            functionName: this._sesConfigurationSetLambdaName,
        });

        resolver.addToRolePolicy(
            new iam.PolicyStatement({
                actions: ['ses:CreateConfigurationSet', 'ses:DeleteConfigurationSet'],
                resources: [`*`],
                effect: iam.Effect.ALLOW,
            }),
        );
        resolver.addToRolePolicy(
            new iam.PolicyStatement({
                actions: [
                    'ses:CreateConfigurationSetEventDestination',
                    'ses:UpdateConfigurationSetEventDestination',
                    'ses:DeleteConfigurationSetEventDestination',
                ],
                resources: [`*`],
                effect: iam.Effect.ALLOW,
            }),
        );

        const resource = new cfn.CustomResource(this, 'SESConfigurationSet', {
            provider: cfn.CustomResourceProvider.lambda(resolver),
            properties: props,
        });

        this.response = resource.getAtt('Response').toString();
    }
}
