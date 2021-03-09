import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as agw from '@aws-cdk/aws-apigateway';
import { Authorizer, IdentitySource, RestApi } from '@aws-cdk/aws-apigateway';
import { config } from '../config';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';

export class EmailService {
    private _apiAuth: NodejsFunction;
    private _authorizer: Authorizer;

    constructor(scope: cdk.Construct, api: agw.RestApi) {
        this._initAuth(scope);
        this._initPaths(scope, api);
    }

    private _initAuth(scope: cdk.Construct) {
        this._apiAuth = new NodejsFunction(scope, 'EmailAPIAuthorizer', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambda.LAMBDA_ROOT}/emailApiAuth/index.ts`,
            bundling: {
                nodeModules: ['cryptr'],
            },
        });

        this._authorizer = new agw.RequestAuthorizer(scope, 'RequestAuthorizer', {
            handler: this._apiAuth,
            identitySources: [IdentitySource.header('Authorization')],
        });
    }

    /**
     * Define email endpoints
     * All email related (external API) endpoints MUST include the emailAuth authorizer
     * ie. use {authorizer: this._authorizer}
     * */
    private _initPaths(scope: cdk.Construct, api: agw.RestApi): void {
        const emailApiAuthReqValidator = new agw.RequestValidator(scope, 'EmailApiValidator', {
            restApi: api,
            requestValidatorName: 'email-api-auth-req-validator',
            validateRequestBody: true,
            validateRequestParameters: true,
        });

        const emailApiAuthReqModel = new agw.Model(scope, 'EmailApiAuthReqModel', {
            restApi: api,
            contentType: 'application/json',
            description: 'Email api auth request payload',
            schema: {
                type: agw.JsonSchemaType.OBJECT,
                properties: {
                    body: {
                        type: agw.JsonSchemaType.OBJECT,
                        properties: {
                            templateID: {
                                type: agw.JsonSchemaType.STRING,
                            },
                            apiKey: {
                                type: agw.JsonSchemaType.STRING,
                            },
                        },
                    },
                },
                required: ['templateID', 'apiKey'],
            },
        });

        const emailApiAuthResource = api.root.addResource('emailApiAuth');
        const emailApiAuthIntegration = new agw.LambdaIntegration(this._apiAuth);
        emailApiAuthResource.addMethod('POST', emailApiAuthIntegration, {
            authorizer: this._authorizer,
            requestValidator: emailApiAuthReqValidator,
            requestModels: { 'application/json': emailApiAuthReqModel },
        });
    }
}
