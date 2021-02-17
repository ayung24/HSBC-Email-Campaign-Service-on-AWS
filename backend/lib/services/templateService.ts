import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as agw from '@aws-cdk/aws-apigateway';
import * as cognito from '@aws-cdk/aws-cognito';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { config } from '../config';

export class TemplateService {
    private _upload: lambda.Function;
    private _list: lambda.Function;
    private _templateAuth: agw.CognitoUserPoolsAuthorizer;
    private _esbuildOptions = {
        target: 'es2018',
    };

    constructor(scope: cdk.Construct, api: agw.RestApi) {
        this._initAuth(scope);
        this._initFunctions(scope);
        this._initPaths(scope, api)
    }

    private _initAuth(scope: cdk.Construct) {
        const userPool = cognito.UserPool.fromUserPoolId(scope, 'UserPool', config.cognito.USER_POOL_ID);
        this._templateAuth = new agw.CognitoUserPoolsAuthorizer(scope, 'TemplateAuthorizer', {
            cognitoUserPools: [userPool],
        });
    }

    private _initFunctions(scope: cdk.Construct) {
        this._upload = new NodejsFunction(scope, 'UploadTemplateHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambdaRoot}/uploadTemplate/index.ts`,
            bundling: {
                ...this._esbuildOptions,
                nodeModules: ['uuid']
            }
        });
        this._list = new NodejsFunction(scope, 'ListTemplatesHandler', {
            runtime: lambda.Runtime.NODEJS_12_X,
            entry: `${config.lambdaRoot}/listTemplates/index.ts`,
            bundling: this._esbuildOptions,
        });
    }

    private _initPaths(scope: cdk.Construct, api: agw.RestApi) {
        
        const uploadReqValidator = new agw.RequestValidator(scope, "UploadTemplateValidator", {
            restApi: api,
            requestValidatorName: 'template-upload-req-validator',
            validateRequestBody: true 
        })
        const uploadReqModel = new agw.Model(scope, "UploadTemplateReqModel", {
            restApi: api,
            contentType: "application/json",
            description: "Upload template request payload",
            schema: {
                type: agw.JsonSchemaType.OBJECT,
                properties: {
                    name: {
                        type: agw.JsonSchemaType.STRING
                    },
                    html: {
                        type: agw.JsonSchemaType.STRING
                    }
                },
                required: ["name", "html"]
            }
        })
        /**
         * Define templates endpoints
         * All template related (internal API) endpoints MUST include the templateAuth authorizer
         * */
        const templatesResource = api.root.addResource('templates');
        const uploadIntegration = new agw.LambdaIntegration(this._upload);
        const listIntegration = new agw.LambdaIntegration(this._list);

        templatesResource.addMethod('POST', uploadIntegration, {
            requestValidator: uploadReqValidator,
            requestModels: {"application/json": uploadReqModel}
         });
        templatesResource.addMethod('GET', listIntegration, { authorizer: this._templateAuth });
    }

    public uploadTemplate(): lambda.Function {
        return this._upload;
    }

    public listTemplates(): lambda.Function {
        return this._list;
    }
}
