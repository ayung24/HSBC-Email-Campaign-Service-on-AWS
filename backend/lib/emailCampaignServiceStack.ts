import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apiGateway from '@aws-cdk/aws-apigateway';
import { IdentitySource } from '@aws-cdk/aws-apigateway';
import { TemplateService } from './TemplateService/templateService';
import { HitCounter } from './hitCounter';

/**
 * Main backend stack
 */
export class EmailCampaignServiceStack extends cdk.Stack {
    private _templateService: TemplateService;
    private _api: apiGateway.LambdaRestApi;
    private _auth: apiGateway.RequestAuthorizer;
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
        });
    }

    private _initAuth(): void {
        const apiAuth = new lambda.Function(this, 'APIAuth', {
            runtime: lambda.Runtime.NODEJS_10_X,
            code: lambda.Code.fromAsset('lambda'),
            handler: 'apiAuth.handler',
        });
        this._auth = new apiGateway.RequestAuthorizer(this, 'requestAuthorizer', {
            handler: apiAuth,
            identitySources: [IdentitySource.header('Authorization')],
        });
    }

    private _initPaths(): void {
        const helloResource = this._api.root.addResource('hello');
        const helloIntegration = new apiGateway.LambdaIntegration(this._templateService.hello());
        const helloWorldResource = this._api.root.addResource('helloWorld');
        const helloWorldIntegration = new apiGateway.LambdaIntegration(this._templateService.helloWorld());
        const helloAuthenticatedResource = this._api.root.addResource('helloAuthenticated');
        const helloAuthenticatedIntegration = new apiGateway.LambdaIntegration(this._templateService.helloAuthenticated());

        helloResource.addMethod('GET', helloIntegration);
        helloWorldResource.addMethod('GET', helloWorldIntegration);
        helloAuthenticatedResource.addMethod('GET', helloAuthenticatedIntegration, { authorizer: this._auth });
    }
}
