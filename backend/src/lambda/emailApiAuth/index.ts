import { APIGatewayRequestAuthorizerHandler } from 'aws-lambda';
import * as db from '../../database/dbOperations';
import { ITemplateFullEntry } from '../../database/dbInterfaces';

export const handler: APIGatewayRequestAuthorizerHandler = function (event, context, callback) {
    const Cryptr = require('cryptr');
    const cryptr = new Cryptr('my-secret-key-that-is-not-too-secret');

    // TODO 1: How to extract the API key from email POST request body
    const apiKeyFromPOSTReq = 'test123';

    // Query DynamoDB to retrieve template's metadata and decrypt DB-stored API key
    // TODO 2: Where to get template ID?
    db.GetTemplateById('1234').then((entry: ITemplateFullEntry) => {
        const decryptKey: string = cryptr.decrypt(entry.apiKey);
        if (decryptKey === apiKeyFromPOSTReq) {
            callback(null, generateResponse());
        } else {
            callback('Unmatched API key.');
        }
    });
};

/**
 * Documentation for response:
 * https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-lambda-authorizer.html
 * */
const generateResponse = function () {
    const authResponse: any = {};
    authResponse.isAuthorized = true;
    return authResponse;
};

/**
export const handler: APIGatewayRequestAuthorizerHandler = function (event, context, callback) {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // A simple request-based authorizer example to demonstrate how to use request
    // parameters to allow or deny a request. In this example, a request is
    // authorized if the client-supplied headerauth1 header, QueryString1
    // query parameter, and stage variable of StageVar1 all match
    // specified values of 'headerValue1', 'queryValue1', and 'stageValue1',
    // respectively.

    // Retrieve request parameters from the Lambda function input:
    var headers = event.headers;
    var queryStringParameters = event.queryStringParameters;
    var pathParameters = event.pathParameters;
    var stageVariables = event.stageVariables;

    // Parse the input for the parameter values
    var tmp = event.methodArn.split(':');
    var apiGatewayArnTmp = tmp[5].split('/');
    var awsAccountId = tmp[4];
    var region = tmp[3];
    var restApiId = apiGatewayArnTmp[0];
    var stage = apiGatewayArnTmp[1];
    var method = apiGatewayArnTmp[2];
    var resource = '/'; // root resource
    if (apiGatewayArnTmp[3]) {
        resource += apiGatewayArnTmp[3];
    }

    // Perform authorization to return the Allow policy for correct parameters and
    // the 'Unauthorized' error, otherwise.
    var authResponse = {};
    var condition = {};
    condition.IpAddress = {};

    if (headers.Authorization === 'test123') {
        callback(null, generateAllow('me', event.methodArn));
    } else {
        callback('Unauthorized');
    }
};

// Help function to generate an IAM policy
var generatePolicy = function (principalId, effect, resource) {
    // Required output:
    var authResponse = {};
    authResponse.principalId = principalId;
    if (effect && resource) {
        var policyDocument = {};
        policyDocument.Version = '2012-10-17'; // default version
        policyDocument.Statement = [];
        var statementOne = {};
        statementOne.Action = 'execute-api:Invoke'; // default action
        statementOne.Effect = effect;
        statementOne.Resource = resource;
        policyDocument.Statement[0] = statementOne;
        authResponse.policyDocument = policyDocument;
    }
    // Optional output with custom properties of the String, Number or Boolean type.
    authResponse.context = {
        stringKey: 'stringval',
        numberKey: 123,
        booleanKey: true,
    };
    return authResponse;
};

var generateAllow = function (principalId, resource) {
    return generatePolicy(principalId, 'Allow', resource);
};

var generateDeny = function (principalId, resource) {
    return generatePolicy(principalId, 'Deny', resource);
};
 */
