import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import { NodejsFunction } from 'aws-lambda-nodejs-esbuild';
import { config } from '../config';

export class TemplateService {
    private _upload: lambda.Function;
    private _list: lambda.Function;
    private _esbuildOptions = {
        target: 'es2018',
    };

    constructor(scope: cdk.Construct) {
        this._initFunctions(scope);
    }

    private _initFunctions(scope: cdk.Construct) {
        this._upload = new NodejsFunction(scope, 'UploadTemplateHandler', {
            runtime: lambda.Runtime.NODEJS_10_X,
            rootDir: `${config.lambdaRoot}/uploadTemplate`,
            esbuildOptions: this._esbuildOptions,
        });
        this._list = new NodejsFunction(scope, 'ListTemplatesHandler', {
            runtime: lambda.Runtime.NODEJS_10_X,
            rootDir: `${config.lambdaRoot}/listTemplates`,
            esbuildOptions: this._esbuildOptions,
        });
    }

    public uploadTemplate(): lambda.Function {
        return this._upload;
    }

    public listTemplates(): lambda.Function {
        return this._list;
    }
}
