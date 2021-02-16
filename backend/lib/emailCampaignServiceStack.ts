import * as cdk from '@aws-cdk/core';
import * as cognito from '@aws-cdk/aws-cognito';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apiGateway from '@aws-cdk/aws-apigateway';
import {Authorizer, IdentitySource} from '@aws-cdk/aws-apigateway';
import {TemplateService} from './services/templateService';
import {config} from './config';
import { EmailService } from './services/emailService';
import { NodejsFunction } from 'aws-lambda-nodejs-esbuild';

/**
 * Main backend stack
 */
export class EmailCampaignServiceStack extends cdk.Stack {
    private _templateService: TemplateService;
    private _emailService: EmailService;
    
    private _api: apiGateway.LambdaRestApi;
    private _templateAuth: Authorizer;
    private _emailAuth: Authorizer;

    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        this._templateService = new TemplateService(this);

        this._initApi();
        this._initAuth();
        this._initPaths();
    }

    private _initApi(): void {
        this._api = new apiGateway.RestApi(this, 'RestApi', {
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
        
        const apiAuth = new NodejsFunction(this, 'EmailAPIAuthorizer', {
            runtime: lambda.Runtime.NODEJS_10_X,
            rootDir: 'src/lambda',
            handler: 'emailApiAuth.handler',
            esbuildOptions: {
                target: 'es2018',
            }
        })
        this._emailAuth = new apiGateway.RequestAuthorizer(this, 'requestAuthorizer', {
            handler: apiAuth,
            identitySources: [IdentitySource.header('Authorization')]
        });
    }

    private _initPaths(): void {
        /** 
         * Define templates endpoints
         * All template related (internal API) endpoints MUST include the templateAuth authorizer
         * */ 
        const templatesResource = this._api.root.addResource('templates');
        const uploadIntegration = new apiGateway.LambdaIntegration(this._templateService.uploadTemplate())
        const listIntegration = new apiGateway.LambdaIntegration(this._templateService.listTemplates())

        templatesResource.addMethod('POST', uploadIntegration, {authorizer: this._templateAuth});
        templatesResource.addMethod('GET', listIntegration, {authorizer: this._templateAuth});
        
        /**
         * Define email endpoints
         * All email related (external API) endpoints MUST include the emailAuth authorizer
         * ie. use {authorizer: this._emailAuth}
         * */
        // TODO: add email endpoints
    }
}
