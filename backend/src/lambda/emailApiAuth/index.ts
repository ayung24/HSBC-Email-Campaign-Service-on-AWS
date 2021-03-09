import { APIGatewayRequestAuthorizerHandler } from 'aws-lambda';
import * as db from '../../database/dbOperations';
import { ITemplateFullEntry } from '../../database/dbInterfaces';
import { IEmailAPIAuthReq } from '../lambdaInterfaces';

export const handler: APIGatewayRequestAuthorizerHandler = function (event, context, callback) {
    const Cryptr = require('cryptr');
    const cryptr = new Cryptr('my-secret-key-that-is-not-too-secret');

    const reqContext: IEmailAPIAuthReq = JSON.parse(event.requestContext.body);

    const apiKeyFromPOSTReq = reqContext.apiKey;

    // Query DynamoDB to retrieve template's metadata and decrypt DB-stored API key
    db.GetTemplateById(reqContext.templateID).then((entry: ITemplateFullEntry) => {
        const decryptKey: string = cryptr.decrypt(entry.apiKey);
        if (decryptKey === apiKeyFromPOSTReq) {
            callback(null, generateResponse(event.requestContext.identity.cognitoIdentityId, event.methodArn));
        } else {
            callback('Unmatched API key.');
        }
    });
};

/**
 * Documentation for response:
 * https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-lambda-authorizer.html
 * */
const generateResponse = function (principalID: string, methodArn: string) {
    const authResponse: any = {};
    authResponse.principalId = principalID;
    const policyDocument: any = {};
    policyDocument.Version = '2012-10-17'; // default version
    policyDocument.Statement = [];
    const statementOne: any = {};
    statementOne.Action = 'execute-api:Invoke'; // default action
    statementOne.Effect = 'Allow';
    statementOne.Resource = methodArn;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
    return authResponse;
};
