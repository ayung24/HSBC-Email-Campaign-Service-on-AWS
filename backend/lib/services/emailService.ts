import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as agw from '@aws-cdk/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import { config } from '../config';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { Database } from '../constructs/database';
import { SESEmailVerifier } from '../constructs/emailVerifier';

export class EmailService {
    private _authorizer: agw.Authorizer;
    private _send: lambda.Function;

    constructor(scope: cdk.Construct, api: agw.RestApi, database: Database) {
        new SESEmailVerifier(scope, 'SESEmailVerify', {
            email: config.ses.VERIFIED_EMAIL_ADDRESS,
        });
        this._initFunctions(scope, database);
        this._initAuth(scope);
        this._initPaths(api);
    }

    private _initAuth(scope: cdk.Construct) {
        const apiAuth = new NodejsFunction(scope, 'EmailAPIAuthorizer', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambda.LAMBDA_ROOT}/emailApiAuth/index.ts`,
        });

        // TODO: Uncomment when implementing send
        // this._authorizer = new agw.RequestAuthorizer(this, 'RequestAuthorizer', {
        //     handler: apiAuth,
        //     identitySources: [IdentitySource.header('Authorization')],
        // });
    }

    private _initFunctions(scope: cdk.Construct, database: Database) {
        this._send = new NodejsFunction(scope, 'SendEmailHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambda.LAMBDA_ROOT}/sendEmail/index.ts`,
            environment: {
                HTML_BUCKET_NAME: database.htmlBucket().bucketName,
                VERIFIED_EMAIL_ADDRESS: config.ses.VERIFIED_EMAIL_ADDRESS,
                VERSION: config.ses.VERSION,
            },
            bundling: {
                nodeModules: ['@aws-sdk/client-ses', 'nodemailer'],
            },
        });
        database.htmlBucket().grantRead(this._send); // READ access to HTML bucket
        this._send.addToRolePolicy(
            new iam.PolicyStatement({
                // SEND permission using SES
                actions: ['ses:SendEmail', 'ses:SendRawEmail'],
                resources: ['*'],
                effect: iam.Effect.ALLOW,
            }),
        );
    }

    /**
     * Define email endpoints
     * All email related (external API) endpoints MUST include the emailAuth authorizer
     * ie. use {authorizer: this._authorizer}
     * */
    private _initPaths(api: agw.RestApi): void {
        const emailResource = api.root.addResource('email');
        const sendIntegration = new agw.LambdaIntegration(this._send);

        emailResource.addMethod('POST', sendIntegration, { authorizer: this._authorizer });
    }
}
