import { APIGatewayProxyEvent } from 'aws-lambda';
import * as processEmailBatchHandler from '../../src/lambda/processBatchSend';
import { EntryStatus, ITemplateWithHTML } from '../../src/database/dbInterfaces';
import { ApiGatewayProxyEventMockBuilder } from '../mocks/apiGatewayProxyEvent.mock';
import { ErrorCode, ESCError, ErrorMessages } from '../../src/ESCError';
import * as db from '../../src/database/dbOperations';
import { ISendEmailReqBody } from '../../src/lambda/lambdaInterfaces';
import { SendMessageResult } from 'aws-sdk/clients/sqs';


describe('POST /emailBatch', () => {
    beforeEach(() => {
        process.env = Object.assign(process.env, {
            EMAIL_QUEUE_URL: 'https://sqs.ca-central-1.amazonaws.com/1234567890/EmailQueue-dev.fifo',
            VERIFIED_EMAIL_ADDRESS: 'test-sender@email.com',
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it.skip('Send email: VALID request', async () => {
        const reqBody: ISendEmailReqBody = {
            // Some dummy values
            subject: 'test subject',
            recipient: 'test-recipient@email.com',
            fields: { 'test_field': 'value1' },
        };

        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            body: JSON.stringify(reqBody),
            queryStringParameters: {
                templateid: 'valid-test-id',
            },
        });

        const mTemplate: ITemplateWithHTML = {
            // Some dummy values
            templateId: 'valid-test-id',
            timeCreated: 1616066356850,
            templateStatus: EntryStatus.IN_SERVICE,
            templateName: 'test template',
            apiKey: 'API-KEY',
            fieldNames: ['test_field'],
            html: '<p>${test_field}</p>',
        };

        const mData: SendMessageResult = {
            MessageId: 'test-message-id-1',
        };

        const mResponse = {
            templateId: mTemplate.templateId,
            sender: process.env.VERIFIED_EMAIL_ADDRESS,
            recipient: 'test-recipient@email.com',
            queueMessageId: mData.MessageId,
        };

        jest.spyOn(processEmailBatchHandler, 'validateEnv').mockReturnValue(true);
        // jest.spyOn(processEmailBatchHandler, 'sendMessage').mockImplementation(() => Promise.resolve(mData.MessageId));

        const retrieveTemplateSpy = jest.spyOn(db, 'GetTemplateById').mockReturnValue(
            new Promise(resolve => {
                resolve(mTemplate);
            }),
        );

        const result = await processEmailBatchHandler.handler(testEvent);
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(JSON.stringify(mResponse));
        expect(retrieveTemplateSpy).toBeCalledWith(testEvent.queryStringParameters!.templateid);
    });

    it.skip('Send email: VALID extra dynamic field', async () => {
        const reqBody: ISendEmailReqBody = {
            // Some dummy values
            subject: 'test subject',
            recipient: 'test-recipient@email.com',
            fields: { 'test_field': 'value1', 'test_field_two': 'value2' },
        };

        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            body: JSON.stringify(reqBody),
            queryStringParameters: {
                templateid: 'valid-test-id',
            },
        });

        const mTemplate: ITemplateWithHTML = {
            // Some dummy values
            templateId: 'valid-test-id',
            timeCreated: 1616066356850,
            templateStatus: EntryStatus.IN_SERVICE,
            templateName: 'test template',
            apiKey: 'API-KEY',
            fieldNames: ['test_field'],
            html: '<p>${test_field}</p>',
        };

        const mData: SendMessageResult = {
            MessageId: 'test-message-id-2',
        };

        jest.spyOn(processEmailBatchHandler, 'validateEnv').mockReturnValue(true);
        // jest.spyOn(processEmailBatchHandler, 'sendMessage').mockImplementation(() => Promise.resolve(mData.MessageId));
        const retrieveTemplateSpy = jest.spyOn(db, 'GetTemplateById').mockReturnValue(
            new Promise(resolve => {
                resolve(mTemplate);
            }),
        );

        const mResponse = {
            templateId: mTemplate.templateId,
            sender: process.env.VERIFIED_EMAIL_ADDRESS,
            recipient: 'test-recipient@email.com',
            queueMessageId: mData.MessageId,
        };

        const result = await processEmailBatchHandler.handler(testEvent);
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(JSON.stringify(mResponse));
        expect(retrieveTemplateSpy).toBeCalledWith(testEvent.queryStringParameters!.templateid);
    });

    it('Send email: INVALID missing template id', async () => {
        const reqBody = {
            // Some dummy values
            emails: [{
                subject: 'test subject',
                recipient: 'test-recipient@email.com',
                fields: { 'test_field': 'value1' }
            },
            {
                subject: 'test subject 2',
                recipient: 'test-recipient-2@email.com',
                fields: { 'test_field': 'value2' }
            }]
        };

        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            body: JSON.stringify(reqBody),
            queryStringParameters: {
                templateid: undefined,
            },
        });

        jest.spyOn(processEmailBatchHandler, 'validateEnv').mockReturnValue(true);

        const mResponse = {
            message:ErrorMessages.INVALID_REQUEST_FORMAT,
            code: ErrorCode.ES18,
        };

        const result = await processEmailBatchHandler.handler(testEvent);
        expect(result.statusCode).toEqual(400);
        expect(result.body).toEqual(JSON.stringify(mResponse));
    });

    it('Send email: INVALID missing event body', async () => {
        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            body: undefined,
            queryStringParameters: {
                templateid: 'valid-template-id',
            },
        });

        jest.spyOn(processEmailBatchHandler, 'validateEnv').mockReturnValue(true);

        const mResponse = {
            message:ErrorMessages.INVALID_REQUEST_FORMAT,
            code: ErrorCode.ES18,
        };

        const result = await processEmailBatchHandler.handler(testEvent);
        expect(result.statusCode).toEqual(400);
        expect(result.body).toEqual(JSON.stringify(mResponse));
    });
});