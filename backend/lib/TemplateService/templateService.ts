import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import { NodejsFunction } from 'aws-lambda-nodejs-esbuild';

export class TemplateService {
    private _hello: lambda.Function;
    private _helloWorld: lambda.Function;
    private _helloAuthenticated: lambda.Function;

    constructor(scope: cdk.Construct) {
        this._initFunctions(scope);
    }

    private _initFunctions(scope: cdk.Construct) {
        // Example using Typescript lambda handler
        this._hello = new NodejsFunction(scope, 'HelloHandler', {
            runtime: lambda.Runtime.NODEJS_10_X, // execution environment
            rootDir: 'src/lambda', // code loaded from "src/lambda" directory
            handler: 'hello.handler', // file is "hello", function is "handler"
            esbuildOptions: {
                target: 'es2018',
            },
        });
        this._helloWorld = new lambda.Function(scope, 'HelloWorldHandler', {
            runtime: lambda.Runtime.NODEJS_10_X, // execution environment
            code: lambda.Code.fromAsset('lambda'), // code loaded from "lambda" directory
            handler: 'helloWorld.handler', // file is "helloWorld", function is "handler"
        });
        this._helloAuthenticated = new lambda.Function(scope, 'HelloAuthenticatedHandler', {
            runtime: lambda.Runtime.NODEJS_10_X, // execution environment
            code: lambda.Code.fromAsset('lambda'), // code loaded from "lambda" directory
            handler: 'helloAuthenticated.handler', // file is "helloAuthenticated", function is "handler"
        });
    }

    public hello(): lambda.Function {
        return this._hello;
    }

    public helloWorld(): lambda.Function {
        return this._helloWorld;
    }

    public helloAuthenticated(): lambda.Function {
        return this._helloAuthenticated;
    }
}
