import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as agw from '@aws-cdk/aws-apigateway';
import { Authorizer, RestApi } from '@aws-cdk/aws-apigateway';
import { config } from '../config';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';

export class EmailService {
    private _authorizer: Authorizer;
    
    constructor(scope: cdk.Construct, api: agw.RestApi) {
        this._initAuth(scope);
    }

    private _initAuth(scope: cdk.Construct) {
        const apiAuth = new NodejsFunction(scope, 'EmailAPIAuthorizer', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambdaRoot}/emailApiAuth/index.ts`,
        });

        // TODO: Uncomment when implementing send
        // this._authorizer = new agw.RequestAuthorizer(this, 'RequestAuthorizer', {
        //     handler: apiAuth,
        //     identitySources: [IdentitySource.header('Authorization')],
        // });
    }

    /**
     * Define email endpoints
     * All email related (external API) endpoints MUST include the emailAuth authorizer
     * ie. use {authorizer: this._authorizer}
     * */
    private _initPaths(api: agw.RestApi): void {
        // TODO: add email endpoints to api
    }
}
