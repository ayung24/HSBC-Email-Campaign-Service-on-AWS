import { APIGatewayRequestAuthorizerHandler } from 'aws-lambda';
import * as db from '../../database/dbOperations';
import { ITemplateFullEntry } from '../../database/dbInterfaces';
import { IEmailAPIAuthReq } from '../lambdaInterfaces';
import { AWSError, KMS} from 'aws-sdk';
import { config } from '../../../../frontend/src/config';

export const handler: APIGatewayRequestAuthorizerHandler = function (event, context, callback) {
    const keyManagementService: KMS = new KMS({
        region: config.kms.REGION,
        accessKeyId: config.kms.ACCESS_KEY,
        secretAccessKey: config.kms.SECRET_KEY,
    });

    const reqContext: IEmailAPIAuthReq = JSON.parse(context.clientContext.Custom);
    const apiKeyFromPOSTReq = reqContext.apiKey;

    // Query DynamoDB to retrieve template's metadata and decrypt DB-stored API key
    db.GetTemplateById(reqContext.templateID).then((entry: ITemplateFullEntry) => {
        const kmsRegion = config.kms.REGION;
        const kmsAccountID = config.kms.ACCOUNT_ID;
        const kmsKeyId = config.kms.KEY_ID;

        const apiKeyBuffer = Buffer.from(entry.apiKey, 'base64');
        const decryptParam = {
            KeyId: `arn:aws:kms:${kmsRegion}:${kmsAccountID}:key/${kmsKeyId}`,
            CiphertextBlob: apiKeyBuffer,
        };

        let decryptKey: string;
        keyManagementService.decrypt(decryptParam, (err: AWSError, data: KMS.Types.DecryptResponse) => {
            if (err || !data.Plaintext) {
                return new Error('Failed to decrypt.');
            } else {
                decryptKey = data.Plaintext.toString('ascii');
            }
        });

        if (decryptKey === apiKeyFromPOSTReq) {
            callback(null, generateResponse(event.requestContext.identity.userAgent, event.methodArn));
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
