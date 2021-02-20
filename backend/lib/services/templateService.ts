import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as agw from '@aws-cdk/aws-apigateway';

import { UserPool } from '@aws-cdk/aws-cognito'
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { config } from '../config';
import { CognitoUserPoolsAuthorizer } from '@aws-cdk/aws-apigateway';
import { DatabaseService } from './databaseService';

export class TemplateService {
    private _upload: lambda.Function;
    private _list: lambda.Function;
    private _authorizer: CognitoUserPoolsAuthorizer;

    constructor(scope: cdk.Construct, api: agw.RestApi, database: DatabaseService) {
        this._initFunctions(scope, database);
        this._initAuth(scope);
        this._initPaths(api);

        // TODO: delete this
        database.InitDebug(scope, api);
    }

    private _initAuth(scope: cdk.Construct) {
        const userPool = UserPool.fromUserPoolId(scope, 'UserPool', config.cognito.USER_POOL_ID);
        this._authorizer = new agw.CognitoUserPoolsAuthorizer(scope, 'TemplateAuthorizer', {
            cognitoUserPools: [userPool],
        });
    }

    private _initFunctions(scope: cdk.Construct, database: DatabaseService) {
        this._upload = new NodejsFunction(scope, 'UploadTemplateHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambdaRoot}/uploadTemplate/index.ts`,
            bundling: {
                externalModules: ['uuid']
            },
        });
        database.AssignMetadataTable(this._upload);
        database.AssignHTMLTable(this._upload);

        this._list = new NodejsFunction(scope, 'ListTemplatesHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambdaRoot}/listTemplates/index.ts`,
        });
        database.AssignMetadataTable(this._list);
    }

    /**
     * Define templates endpoints
     * All template related (internal API) endpoints MUST include the templateAuth authorizer
     * */
    private _initPaths(api: agw.RestApi) {
        const templatesResource = api.root.addResource('templates');
        const uploadIntegration = new agw.LambdaIntegration(this._upload);
        const listIntegration = new agw.LambdaIntegration(this._list);

        templatesResource.addMethod('POST', uploadIntegration, { authorizer: this._authorizer });
        templatesResource.addMethod('GET', listIntegration, { authorizer: this._authorizer });
    }
}
