import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import * as db from '../../database/dbOperations';
import { ITemplateFullEntry } from '../../database/dbInterfaces';
import { AWSError, KMS } from 'aws-sdk';
import * as Logger from '../../logger';
import { ErrorCode, ESCError } from '../../ESCError';

const KMS_REGION = process.env.KMS_REGION;
const KMS_ACCOUNT_ID = process.env.KMS_ACCOUNT_ID;
const KMS_KEY_ID = process.env.KMS_KEY_ID;
const METADATA_TABLE_NAME = process.env.METADATA_TABLE_NAME;
const HTML_BUCKET_NAME = process.env.HTML_BUCKET_NAME;
const PROCESSED_HTML_PATH = process.env.PROCESSED_HTML_PATH;

const kms: KMS = new KMS({
    region: KMS_REGION,
});

/**
 * Validates lambda's runtime env variables
 */
export const validateEnv = function (variables: Array<string|undefined>): boolean {
    return !variables.some(v => !v)
};

export const kmsDecrypt = function (decryptParam: { KeyId: string; CiphertextBlob: Buffer; }, apiKey: string, template: ITemplateFullEntry, event: APIGatewayRequestAuthorizerEvent): Promise<any> {
    return new Promise((resolve, reject) => {
        kms.decrypt(decryptParam, (err: AWSError, data: KMS.Types.DecryptResponse) => {
            if (err || !data.Plaintext) {
                Logger.logError(err);
                reject(new ESCError(ErrorCode.ES8, 'KMS error'));
            } else if (data.Plaintext.toString() === apiKey) {
                Logger.info({ message: 'Authorization success', additionalInfo: { templateId: template.templateId } });
                resolve(generatePolicy(event.requestContext.identity.userAgent || '', 'Allow', event.methodArn));
            } else {
                Logger.err({
                    message: 'Authorization failure',
                    additionalInfo: {
                        templateId: template.templateId,
                        expectedApiKey: data.Plaintext.toString(),
                        given: apiKey,
                        code: ErrorCode.ES9,
                    },
                });
                reject(new ESCError(ErrorCode.ES9, 'Invalid API Key'));
            }
        });
    });
}

export const handler = async function (event: APIGatewayRequestAuthorizerEvent) {
    const kmsRegion = process.env.KMS_REGION;
    const kmsAccountId = process.env.KMS_ACCOUNT_ID;
    const kmsKeyId = process.env.KMS_KEY_ID;
    Logger.info({
        message: 'Received POST /email authorization request',
        additionalInfo: event,
    });

    const envList: Array<string|undefined> = [METADATA_TABLE_NAME, KMS_KEY_ID, KMS_REGION, KMS_ACCOUNT_ID, HTML_BUCKET_NAME, PROCESSED_HTML_PATH]
    if (!validateEnv(envList)) {
        const error = new ESCError(ErrorCode.ES6, 'Environment variables not set');
        Logger.logError(error);
        return Promise.reject('Unauthorized');
    }

    const apiKey = event.headers?.APIKey ?? event.headers?.apikey;
    const templateId = event.queryStringParameters?.templateid;
    if (!templateId || !apiKey) {
        const error = new ESCError(ErrorCode.ES7, 'Missing templateId or API key');
        Logger.logError(error);
        return Promise.reject('Unauthorized');
    }

    Logger.info({
        message: 'Authorizing context',
        additionalInfo: {
            templateId: templateId,
            apiKey: apiKey,
        },
    });

    // Query DynamoDB to retrieve template's metadata and decrypt DB-stored API key
    return db
        .GetTemplateById(templateId)
        .then((template: ITemplateFullEntry) => {
            Logger.info({
                message: 'Retrieved template',
                additionalInfo: template,
            });
            console.log('here1')

            const decryptParam = {
                KeyId: `arn:aws:kms:${kmsRegion}:${kmsAccountId}:key/${kmsKeyId}`,
                CiphertextBlob: Buffer.from(template.apiKey, 'base64'),
            };
            console.log('here2')
            return kmsDecrypt(decryptParam, apiKey, template, event);
        })
        .catch(err => {
            console.log('here3')
            Logger.logError(err);
            return Promise.reject('Unauthorized');
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
