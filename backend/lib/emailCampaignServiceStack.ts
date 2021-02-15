import * as cdk from '@aws-cdk/core';
import * as cognito from '@aws-cdk/aws-cognito';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apiGateway from '@aws-cdk/aws-apigateway';
import {Authorizer, IdentitySource} from '@aws-cdk/aws-apigateway';
import {TemplateService} from './services/templateService';
import {HitCounter} from './hitCounter';
import {config} from './config';

/**
 * Main backend stack
 */
export class EmailCampaignServiceStack extends cdk.Stack {
    private _templateService: TemplateService;
    private _api: apiGateway.LambdaRestApi;
    private _templateAuth: Authorizer;
    private _emailAuth: Authorizer;
    private _helloWithCounter: HitCounter;

    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this._templateService = new TemplateService(this);

        this._helloWithCounter = new HitCounter(this, 'HelloHitCounter', {
            downstream: this._templateService.hello(),
        });

        this._initApi();
        this._initAuth();
        this._initPaths();
    }

    private _initApi(): void {
        this._api = new apiGateway.LambdaRestApi(this, 'Endpoint', {
            handler: this._helloWithCounter.handler,
            proxy: false,
            defaultCorsPreflightOptions: {
                allowOrigins: apiGateway.Cors.ALL_ORIGINS
            }
        });
    }

    private _initAuth(): void {
        const userPool = cognito.UserPool.fromUserPoolId(this, 'UserPool', config.cognito.USER_POOL_ID);
        this._templateAuth = new apiGateway.CognitoUserPoolsAuthorizer(this, 'templateAuthorizer', {
            cognitoUserPools: [userPool]
        })
        const apiAuth = new lambda.Function(this, 'APIAuth', {
            runtime: lambda.Runtime.NODEJS_10_X,
            code: lambda.Code.fromAsset('lambda'),

            handler: 'apiAuth.handler'
        })
        this._emailAuth = new apiGateway.RequestAuthorizer(this, 'requestAuthorizer', {
            handler: apiAuth,
            identitySources: [IdentitySource.header('Authorization')]
        });
    }

    private _initPaths(): void {
        const helloResource = this._api.root.addResource('hello');
        const helloIntegration = new apiGateway.LambdaIntegration(this._templateService.hello());
        const helloWorldResource = this._api.root.addResource('helloWorld');
        const helloWorldIntegration = new apiGateway.LambdaIntegration(this._templateService.helloWorld());
        const helloAuthenticatedResource = this._api.root.addResource('helloAuthenticated');
        const helloAuthenticatedIntegration = new apiGateway.LambdaIntegration(this._templateService.helloAuthenticated());

        // Unauthorized endpoint
        helloResource.addMethod('GET', helloIntegration);
        // All template related (internal API) endpoints MUST include the templateAuth authorizer
        helloWorldResource.addMethod('GET', helloWorldIntegration, {authorizer: this._templateAuth});
        // All email related (external API) endpoints MUST include the emailAuth authorizer
        helloAuthenticatedResource.addMethod('GET', helloAuthenticatedIntegration, {authorizer: this._emailAuth});
    }
}
