import { APIGatewayProxyEvent, APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import * as processEmailHandler from '../../src/lambda/processSend';
import * as emailApiAuthHandler from '../../src/lambda/emailApiAuth';
import { EntryStatus, ITemplateFullEntry, ITemplateWithHTML } from '../../src/database/dbInterfaces';
import { ApiGatewayProxyEventMockBuilder } from '../mocks/apiGatewayProxyEvent.mock';
import { APIGatewayRequestAuthorizerEventMockBuilder } from '../mocks/apiGatewayRequestAuthorizerEvent.mock'
import { ErrorCode, ESCError, ErrorMessages } from '../../src/ESCError';
import * as db from '../../src/database/dbOperations';
import { ISendEmailReqBody } from '../../src/lambda/lambdaInterfaces';
import { SendMessageResult } from 'aws-sdk/clients/sqs';

describe('POST /email', () => {
    beforeEach(() => {
        process.env = Object.assign(process.env, {
            EMAIL_QUEUE_URL: 'https://sqs.ca-central-1.amazonaws.com/1234567890/EmailQueue-dev.fifo',
            VERIFIED_EMAIL_ADDRESS: 'test-sender@email.com',
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // it('Send email: VALID request', async () => {
    //     const reqBody: ISendEmailReqBody = {
    //         // Some dummy values
    //         subject: 'test subject',
    //         recipient: 'test-recipient@email.com',
    //         fields: { 'test_field': 'value1' },
    //     };

    //     const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
    //         body: JSON.stringify(reqBody),
    //         queryStringParameters: {
    //             templateid: 'valid-test-id',
    //         },
    //     });

    //     const mTemplate: ITemplateWithHTML = {
    //         // Some dummy values
    //         templateId: 'valid-test-id',
    //         timeCreated: 1616066356850,
    //         templateStatus: EntryStatus.IN_SERVICE,
    //         templateName: 'test template',
    //         apiKey: 'API-KEY',
    //         fieldNames: ['test_field'],
    //         html: '<p>${test_field}</p>',
    //     };

    //     const mData: SendMessageResult = {
    //         MessageId: 'test-message-id-1',
    //     };

    //     const mResponse = {
    //         templateId: mTemplate.templateId,
    //         sender: process.env.VERIFIED_EMAIL_ADDRESS,
    //         recipient: 'test-recipient@email.com',
    //         queueMessageId: mData.MessageId,
    //     };

    //     jest.spyOn(processEmailHandler, 'validateEnv').mockReturnValue(true);
    //     jest.spyOn(processEmailHandler, 'sendMessage').mockImplementation(() => Promise.resolve(mData.MessageId));

    //     const retrieveTemplateSpy = jest.spyOn(db, 'GetTemplateById').mockReturnValue(
    //         new Promise(resolve => {
    //             resolve(mTemplate);
    //         }),
    //     );

    //     const result = await processEmailHandler.handler(testEvent);
    //     expect(result.statusCode).toEqual(200);
    //     expect(result.body).toEqual(JSON.stringify(mResponse));
    //     expect(retrieveTemplateSpy).toBeCalledWith(testEvent.queryStringParameters!.templateid);
    // });

    // it('Send email: VALID extra dynamic field', async () => {
    //     const reqBody: ISendEmailReqBody = {
    //         // Some dummy values
    //         subject: 'test subject',
    //         recipient: 'test-recipient@email.com',
    //         fields: { 'test_field': 'value1', 'test_field_two': 'value2' },
    //     };

    //     const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
    //         body: JSON.stringify(reqBody),
    //         queryStringParameters: {
    //             templateid: 'valid-test-id',
    //         },
    //     });

    //     const mTemplate: ITemplateWithHTML = {
    //         // Some dummy values
    //         templateId: 'valid-test-id',
    //         timeCreated: 1616066356850,
    //         templateStatus: EntryStatus.IN_SERVICE,
    //         templateName: 'test template',
    //         apiKey: 'API-KEY',
    //         fieldNames: ['test_field'],
    //         html: '<p>${test_field}</p>',
    //     };

    //     const mData: SendMessageResult = {
    //         MessageId: 'test-message-id-2',
    //     };

    //     jest.spyOn(processEmailHandler, 'validateEnv').mockReturnValue(true);
    //     jest.spyOn(processEmailHandler, 'sendMessage').mockImplementation(() => Promise.resolve(mData.MessageId));
    //     const retrieveTemplateSpy = jest.spyOn(db, 'GetTemplateById').mockReturnValue(
    //         new Promise(resolve => {
    //             resolve(mTemplate);
    //         }),
    //     );

    //     const mResponse = {
    //         templateId: mTemplate.templateId,
    //         sender: process.env.VERIFIED_EMAIL_ADDRESS,
    //         recipient: 'test-recipient@email.com',
    //         queueMessageId: mData.MessageId,
    //     };

    //     const result = await processEmailHandler.handler(testEvent);
    //     expect(result.statusCode).toEqual(200);
    //     expect(result.body).toEqual(JSON.stringify(mResponse));
    //     expect(retrieveTemplateSpy).toBeCalledWith(testEvent.queryStringParameters!.templateid);
    // });

    // it('Send email: INVALID missing required dynamic field', async () => {
    //     const reqBody: ISendEmailReqBody = {
    //         // Some dummy values
    //         subject: 'test subject',
    //         recipient: 'test-recipient@email.com',
    //         fields: { 'test_field': 'value1' },
    //     };

    //     const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
    //         body: JSON.stringify(reqBody),
    //         queryStringParameters: {
    //             templateid: 'valid-test-id',
    //         },
    //     });

    //     const mTemplate: ITemplateWithHTML = {
    //         // Some dummy values
    //         templateId: 'valid-test-id',
    //         timeCreated: 1616066356850,
    //         templateStatus: EntryStatus.IN_SERVICE,
    //         templateName: 'test template',
    //         apiKey: 'API-KEY',
    //         fieldNames: ['test_field_two'],
    //         html: '<p>${test_field_two}</p>',
    //     };

    //     jest.spyOn(processEmailHandler, 'validateEnv').mockReturnValue(true);
    //     const retrieveTemplateSpy = jest.spyOn(db, 'GetTemplateById').mockReturnValue(
    //         new Promise(resolve => {
    //             resolve(mTemplate);
    //         }),
    //     );

    //     const mResponse = {
    //         message: `Missing required dynamic fields for template ${testEvent.queryStringParameters!.templateid}`,
    //         code: ErrorCode.ES2,
    //     };

    //     const result = await processEmailHandler.handler(testEvent);
    //     expect(result.statusCode).toEqual(400);
    //     expect(result.body).toEqual(JSON.stringify(mResponse));
    //     expect(retrieveTemplateSpy).toBeCalledWith(testEvent.queryStringParameters!.templateid);
    // });

    // it('Send email: INVALID missing request body', async () => {
    //     const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
    //         queryStringParameters: {
    //             templateid: 'valid-test-id',
    //         },
    //     });

    //     const mResponse = {
    //         message: ErrorMessages.INVALID_REQUEST_FORMAT,
    //         code: ErrorCode.ES1,
    //     };

    //     jest.spyOn(processEmailHandler, 'validateEnv').mockReturnValue(true);

    //     const result = await processEmailHandler.handler(testEvent);
    //     expect(result.statusCode).toEqual(400);
    //     expect(result.body).toEqual(JSON.stringify(mResponse));
    // });

    // it('Send email: INVALID missing template id', async () => {
    //     const reqBody: ISendEmailReqBody = {
    //         // Some dummy values
    //         subject: 'sender@email.com',
    //         recipient: 'recipient@email.com',
    //         fields: { 'test_field': 'value1' },
    //     };
    //     const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
    //         body: JSON.stringify(reqBody),
    //         queryStringParameters: {},
    //     });

    //     const mResponse = {
    //         message: ErrorMessages.INVALID_REQUEST_FORMAT,
    //         code: ErrorCode.ES1,
    //     };

    //     jest.spyOn(processEmailHandler, 'validateEnv').mockReturnValue(true);

    //     const result = await processEmailHandler.handler(testEvent);
    //     expect(result.statusCode).toEqual(400);
    //     expect(result.body).toEqual(JSON.stringify(mResponse));
    // });

    // it('Send email: INVALID non-existent template id', async () => {
    //     const reqBody: ISendEmailReqBody = {
    //         // Some dummy values
    //         subject: 'sender@email.com',
    //         recipient: 'recipient@email.com',
    //         fields: { 'test_field': 'value1' },
    //     };
    //     const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
    //         body: JSON.stringify(reqBody),
    //         queryStringParameters: {
    //             templateid: 'invalid-test-id',
    //         },
    //     });

    //     const mTemplateError = new ESCError(
    //         ErrorCode.TS28,
    //         `No template with id ${testEvent.queryStringParameters!.templateid} found.`,
    //         true,
    //     );
    //     const mResponse = {
    //         message: `No template with id ${testEvent.queryStringParameters!.templateid} found.`,
    //         code: ErrorCode.TS28,
    //     };
    //     const retrieveTemplateSpy = jest.spyOn(db, 'GetTemplateById').mockRejectedValue(mTemplateError);

    //     jest.spyOn(processEmailHandler, 'validateEnv').mockReturnValue(true);

    //     const result = await processEmailHandler.handler(testEvent);
    //     expect(result.statusCode).toEqual(400);
    //     expect(result.body).toEqual(JSON.stringify(mResponse));
    //     expect(retrieveTemplateSpy).toBeCalledWith(testEvent.queryStringParameters!.templateid);
    // });

    // it.skip('Send email: INVALID event body missing subject', async () => {
    //     const reqBody = {
    //         // Some dummy values
    //         recipient: 'test@email.com',
    //         fields: { 'test_field': 'value1' },
    //     };
    //     const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
    //         body: JSON.stringify(reqBody),
    //         queryStringParameters: {
    //             templateid: 'valid-test-id',
    //         },
    //     });

    //     const mTemplate: ITemplateWithHTML = {
    //         // Some dummy values
    //         templateId: 'valid-test-id',
    //         timeCreated: 1616066356850,
    //         templateStatus: EntryStatus.IN_SERVICE,
    //         templateName: 'test template',
    //         apiKey: 'API-KEY',
    //         fieldNames: ['test_field'],
    //         html: '<p>${test_field}</p>',
    //     };

    //     jest.spyOn(processEmailHandler, 'validateEnv').mockReturnValue(true);

    //     const mResponse = {
    //         message: `Missing subject in the request body`,
    //         code: ErrorCode.ES0, // TODO: change this code and message.
    //     };
    //     jest.spyOn(processEmailHandler, 'validateEnv').mockReturnValue(true);

    //     const result = await processEmailHandler.handler(testEvent);
    //     expect(result.statusCode).toEqual(400);
    //     expect(result.body).toEqual(JSON.stringify(mResponse));
    // });

    // it('Send email: INVALID event body missing recipient', async () => {
    //     const reqBody = {
    //         // Some dummy values
    //         subject: 'test subject',
    //         fields: { 'test_field': 'value1' },
    //     };
    //     const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
    //         body: JSON.stringify(reqBody),
    //         queryStringParameters: {
    //             templateid: 'invalid-test-id',
    //         },
    //     });

    //     const mResponse = {
    //         message: `Recipient email address is not a valid email.`,
    //         code: ErrorCode.ES11,
    //     };
    //     jest.spyOn(processEmailHandler, 'validateEnv').mockReturnValue(true);

    //     const result = await processEmailHandler.handler(testEvent);
    //     expect(result.statusCode).toEqual(400);
    //     expect(result.body).toEqual(JSON.stringify(mResponse));
    // });

    // it('Send email: INVALID event body invalid recipient email', async () => {
    //     const reqBody = {
    //         // Some dummy values
    //         subject: 'test subject',
    //         recipient: 'bademail@',
    //         fields: { 'test_field': 'value1' },
    //     };
    //     const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
    //         body: JSON.stringify(reqBody),
    //         queryStringParameters: {
    //             templateid: 'invalid-test-id',
    //         },
    //     });

    //     const mResponse = {
    //         message: `Recipient email address is not a valid email.`,
    //         code: ErrorCode.ES11,
    //     };
    //     jest.spyOn(processEmailHandler, 'validateEnv').mockReturnValue(true);

    //     const result = await processEmailHandler.handler(testEvent);
    //     expect(result.statusCode).toEqual(400);
    //     expect(result.body).toEqual(JSON.stringify(mResponse));
    // });

    // it('Send email: INVALID multiple recipients', async () => {
    //     const reqBody = {
    //         // Some dummy values
    //         subject: 'test subject',
    //         recipient: 'one@email.com;two@email.com',
    //         fields: { 'test_field': 'value1' },
    //     };
    //     const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
    //         body: JSON.stringify(reqBody),
    //         queryStringParameters: {
    //             templateid: 'invalid-test-id',
    //         },
    //     });

    //     const mResponse = {
    //         message: `Recipient email address is not a valid email.`,
    //         code: ErrorCode.ES11,
    //     };

    //     jest.spyOn(processEmailHandler, 'validateEnv').mockReturnValue(true);

    //     const result = await processEmailHandler.handler(testEvent);
    //     expect(result.statusCode).toEqual(400);
    //     expect(result.body).toEqual(JSON.stringify(mResponse));
    // });

    it('Send email: Valid API key', async () => {
        const testEvent:APIGatewayRequestAuthorizerEvent = APIGatewayRequestAuthorizerEventMockBuilder({
            headers: {
                APIKey: 'valid-api-key',
            },
            queryStringParameters: {
                templateid: 'valid-test-id',
            }
        });

        const mTemplate: ITemplateWithHTML = {
            // Some dummy values
            templateId: 'valid-test-id',
            timeCreated: 1616066356850,
            templateStatus: EntryStatus.IN_SERVICE,
            templateName: 'test template',
            apiKey: 'encryted-api-key',
            fieldNames: ['test-field1'],
            html: '<p>${test-field1}</p>',
        };

        jest.spyOn(emailApiAuthHandler, 'validateEnv').mockReturnValue(true);
        const retrieveTemplateSpy = jest.spyOn(db, 'GetTemplateById').mockReturnValue(
            new Promise(resolve => {
                resolve(mTemplate);
            }),
        );
        const mResponse:any = {
            principalId: testEvent.requestContext.identity.userAgent,
            policyDocument: {
                Version: '2012-10-17',
                Statement: [{
                    Action: 'execute-api:Invoke',
                    Effect: '',
                    Resource: testEvent.methodArn,
                }],
            },
        } 
        jest.spyOn(emailApiAuthHandler, 'kmsDecrypt').mockResolvedValue(mResponse);
        expect(emailApiAuthHandler.handler(testEvent)).resolves.toMatch(mResponse);
        expect(retrieveTemplateSpy).toBeCalledWith(testEvent.queryStringParameters!.templateid);
    });

    it('Send email auth: INVALID missing API key', async () => {
        const testEvent:APIGatewayRequestAuthorizerEvent = APIGatewayRequestAuthorizerEventMockBuilder({
            headers: {
                APIKey: undefined,
            },
            queryStringParameters: {
                templateid: 'valid-test-id',
            }
        });

        jest.spyOn(emailApiAuthHandler, 'validateEnv').mockReturnValue(true);
        expect(emailApiAuthHandler.handler(testEvent)).rejects.toMatch('Unauthorized');
    });

    it('Send email auth: INVALID missing template id', async () => {
        const testEvent:APIGatewayRequestAuthorizerEvent = APIGatewayRequestAuthorizerEventMockBuilder({
            headers: {
                APIKey: 'valid-api-key',
            },
            queryStringParameters: {
                templateid: undefined,
            }
        });

        jest.spyOn(emailApiAuthHandler, 'validateEnv').mockReturnValue(true);
        expect(emailApiAuthHandler.handler(testEvent)).rejects.toMatch('Unauthorized');
    });

    it('Send email auth: INVALID wrong api key', async () => {

        const testEvent:APIGatewayRequestAuthorizerEvent = APIGatewayRequestAuthorizerEventMockBuilder({
            headers: {
                APIKey: 'incorrect-api-key',
            },
            queryStringParameters: {
                templateid: 'valid-test-id',
            }
        });

        const mTemplate: ITemplateWithHTML = {
            // Some dummy values
            templateId: 'valid-test-id',
            timeCreated: 1616066356850,
            templateStatus: EntryStatus.IN_SERVICE,
            templateName: 'test template',
            apiKey: 'encryted-api-key',
            fieldNames: ['test-field1'],
            html: '<p>${test-field1}</p>',
        };

        jest.spyOn(emailApiAuthHandler, 'validateEnv').mockReturnValue(true);
        const retrieveTemplateSpy = jest.spyOn(db, 'GetTemplateById').mockReturnValue(
            new Promise(resolve => {
                resolve(mTemplate);
            }),
        );
        const mError = new ESCError(ErrorCode.ES9, 'Invalid API Key');
        jest.spyOn(emailApiAuthHandler, 'kmsDecrypt').mockRejectedValue(mError);
        expect(emailApiAuthHandler.handler(testEvent)).rejects.toMatch('Unauthorized');
        expect(retrieveTemplateSpy).toBeCalledWith(testEvent.queryStringParameters!.templateid);
    });
});
