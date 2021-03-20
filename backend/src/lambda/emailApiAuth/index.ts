import { APIGatewayRequestAuthorizerHandler } from 'aws-lambda';
import * as db from '../../database/dbOperations';
import { ITemplateFullEntry } from '../../database/dbInterfaces';
import { IEmailAPIAuthReqBody } from '../lambdaInterfaces';
import { AWSError, KMS} from 'aws-sdk';
import { config } from '../../../../frontend/src/config';

const KMS_REGION = process.env.KMS_REGION;
const KMS_ACCOUNT_ID = process.env.KMS_ACCOUNT_ID;
const KMS_KEY_ID = process.env.KMS_KEY_ID;
const METADATA_TABLE_NAME = process.env.METADATA_TABLE_NAME;

const KMS_ACCESS_KEY = process.env.KMS_ACCESS_KEY;
const KMS_SECRET_KEY = process.env.KMS_SECRET_KEY;

const kms: KMS = new KMS({
    region: config.kms.REGION
});

export const handler: APIGatewayRequestAuthorizerHandler = function (event, context, callback) {
    const headers = event.headers;
    if (!headers.TemplateId || !headers.APIKey) {
        callback("Unauthorized");
    }

    const authContext: IEmailAPIAuthReqBody = {
        templateId: headers.TemplateId,
        apiKey: headers.APIKey
    }
    console.log("Authorizing context: ", JSON.stringify(authContext));

    // Query DynamoDB to retrieve template's metadata and decrypt DB-stored API key
    db.GetTemplateById(authContext.templateId).then((template: ITemplateFullEntry) => {
        console.log("Retrieved template: ", JSON.stringify(template))
        const decryptParam = {
            KeyId: `arn:aws:kms:${KMS_REGION}:${KMS_ACCOUNT_ID}:key/${KMS_KEY_ID}`,
            CiphertextBlob: Buffer.from(template.apiKey, 'base64'),
        };
        kms.decrypt(decryptParam, (err: AWSError, data: KMS.Types.DecryptResponse) => {
            if (err || !data.Plaintext) {
                callback("Unauthorized");
            } else if (data.Plaintext.toString() === authContext.apiKey) {
                callback(null, generatePolicy(event.requestContext.identity.userAgent, 'Allow', event.methodArn));
            } else {
                callback(null, generatePolicy(event.requestContext.identity.userAgent, 'Deny', event.methodArn));
            }
        });
    }).catch((error) => {
        callback("Unauthorized");
    });
};

/**
 * Documentation for response:
 * https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-lambda-authorizer.html
 * */
const generatePolicy = function (principalID: string, effect: string, methodArn: string) {
    const authResponse: any = {};
    authResponse.principalId = principalID;
    const policyDocument: any = {};
    policyDocument.Version = '2012-10-17'; // default version
    policyDocument.Statement = [];
    const statementOne: any = {};
    statementOne.Action = 'execute-api:Invoke'; // default action
    statementOne.Effect = effect;
    statementOne.Resource = methodArn;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
    return authResponse;
};
