import { APIGatewayRequestAuthorizerHandler } from 'aws-lambda';
import * as db from '../../database/dbOperations';
import { ITemplateFullEntry } from '../../database/dbInterfaces';
import { IEmailAPIAuthReqBody } from '../lambdaInterfaces';
import { AWSError, KMS } from 'aws-sdk';
import * as Logger from '../../../logger';

const KMS_REGION = process.env.KMS_REGION;
const KMS_ACCOUNT_ID = process.env.KMS_ACCOUNT_ID;
const KMS_KEY_ID = process.env.KMS_KEY_ID;
const METADATA_TABLE_NAME = process.env.METADATA_TABLE_NAME;

const kms: KMS = new KMS({
    region: KMS_REGION,
});

/**
 * Validates lambda's runtime env variables
 */
const validateEnv = function (): boolean {
    return !!METADATA_TABLE_NAME && !!KMS_KEY_ID && !!KMS_REGION && !!KMS_ACCOUNT_ID;
};

export const handler: APIGatewayRequestAuthorizerHandler = function (event, context, callback) {
    Logger.info({
        message: 'Received POST /email authorization request',
        additionalInfo: event,
    });

    if (!validateEnv()) {
        callback('Internal server error');
    }

    const apiKey = event.headers?.APIKey;
    const templateId = event.queryStringParameters?.templateid;
    if (!templateId || !apiKey) {
        callback('Unauthorized');
    }

    Logger.info({
        message: 'Authorizing context',
        additionalInfo: {
            templateId: templateId,
            apiKey: apiKey,
        },
    });

    // Query DynamoDB to retrieve template's metadata and decrypt DB-stored API key
    db.GetTemplateById(templateId)
        .then((template: ITemplateFullEntry) => {
            Logger.info({
                message: 'Retrieved template',
                additionalInfo: template,
            });
            const decryptParam = {
                KeyId: `arn:aws:kms:${KMS_REGION}:${KMS_ACCOUNT_ID}:key/${KMS_KEY_ID}`,
                CiphertextBlob: Buffer.from(template.apiKey, 'base64'),
            };
            kms.decrypt(decryptParam, (err: AWSError, data: KMS.Types.DecryptResponse) => {
                if (err || !data.Plaintext) {
                    Logger.logError(err);
                    callback('Unauthorized');
                } else if (data.Plaintext.toString() === apiKey) {
                    Logger.info({ message: 'Authorization success', additionalInfo: { templateId: template.templateId } });
                    callback(null, generatePolicy(event.requestContext.identity.userAgent, 'Allow', event.methodArn));
                } else {
                    Logger.info({
                        message: 'Authorization failure',
                        additionalInfo: { templateId: template.templateId },
                    });
                    callback(null, generatePolicy(event.requestContext.identity.userAgent, 'Deny', event.methodArn));
                }
            });
        })
        .catch(err => {
            Logger.logError(err);
            callback('Unauthorized');
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
