import { APIGatewayProxyEvent } from 'aws-lambda';
import * as processEmailBatchHandler from '../../src/lambda/processBatchSend';
import { ApiGatewayProxyEventMockBuilder } from '../mocks/apiGatewayProxyEvent.mock';
import { ErrorCode, ESCError, ErrorMessages } from '../../src/ESCError';

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

    it('Send email: VALID 1 email', async () => {
        const reqBody = {
            // Some dummy values
            emails: [
                {
                    subject: 'test subject',
                    recipient: 'test-recipient@email.com',
                    fields: { test_field: 'value1' },
                },
            ],
        };

        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            body: JSON.stringify(reqBody),
            queryStringParameters: {
                templateid: 'valid-template-id',
            },
        });

        jest.spyOn(processEmailBatchHandler, 'validateEnv').mockReturnValue(true);
        jest.spyOn(processEmailBatchHandler, 'sendMessage').mockReturnValue(
            new Promise(resolve => {
                resolve('message-id-1');
            }),
        );

        const mResponse = {
            processed: 1,
            failed: 0,
        };

        const result = await processEmailBatchHandler.handler(testEvent);
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(JSON.stringify(mResponse));
    });

    it('Send email: VALID multiple valid emails', async () => {
        const reqBody = {
            // Some dummy values
            emails: [
                {
                    subject: 'test subject',
                    recipient: 'test-recipient@email.com',
                    fields: { test_field: 'value1' },
                },
                {
                    subject: 'test subject 2',
                    recipient: 'test-recipient-2@email.com',
                    fields: { test_field: 'value2' },
                },
                {
                    subject: 'test subject 3',
                    recipient: 'test-recipient-3@email.com',
                    fields: { test_field: 'value3' },
                },
            ],
        };

        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            body: JSON.stringify(reqBody),
            queryStringParameters: {
                templateid: 'valid-template-id',
            },
        });

        jest.spyOn(processEmailBatchHandler, 'validateEnv').mockReturnValue(true);
        jest.spyOn(processEmailBatchHandler, 'sendMessage').mockReturnValueOnce(
            new Promise(resolve => {
                resolve('message-id-1');
            }),
        );
        jest.spyOn(processEmailBatchHandler, 'sendMessage').mockReturnValueOnce(
            new Promise(resolve => {
                resolve('message-id-2');
            }),
        );
        jest.spyOn(processEmailBatchHandler, 'sendMessage').mockReturnValueOnce(
            new Promise(resolve => {
                resolve('message-id-3');
            }),
        );

        const mResponse = {
            processed: 3,
            failed: 0,
        };

        const result = await processEmailBatchHandler.handler(testEvent);
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(JSON.stringify(mResponse));
    });

    it('Send email: VALID some invalid emails', async () => {
        const reqBody = {
            // Some dummy values
            emails: [
                {
                    subject: 'test subject',
                    recipient: 'test-recipient@email.com',
                    fields: { test_field: 'value1' },
                },
                {
                    subject: 'test subject 2',
                    recipient: 'test-recipient-2@email.com',
                    fields: { test_field: 'value2' },
                },
                {
                    subject: 'invalid subject',
                    recipient: 'invalid-recipient@email.com',
                    fields: { invalid_field: 'invalid value' },
                },
            ],
        };

        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            body: JSON.stringify(reqBody),
            queryStringParameters: {
                templateid: 'valid-template-id',
            },
        });

        jest.spyOn(processEmailBatchHandler, 'validateEnv').mockReturnValue(true);
        jest.spyOn(processEmailBatchHandler, 'sendMessage').mockReturnValueOnce(
            new Promise(resolve => {
                resolve('message-id-1');
            }),
        );
        jest.spyOn(processEmailBatchHandler, 'sendMessage').mockReturnValueOnce(
            new Promise(resolve => {
                resolve('message-id-2');
            }),
        );
        const queueError = new ESCError(
            ErrorCode.ES17,
            `Send to queue error: ${JSON.stringify({
                subject: 'invalid subject',
                recipient: 'invalid-recipient@email.com',
                fields: { invalid_field: 'invalid value' },
            })}`,
        );
        jest.spyOn(processEmailBatchHandler, 'sendMessage').mockRejectedValueOnce(
            new Promise(rejects => {
                rejects(queueError);
            }),
        );
        const mResponse = {
            processed: 2,
            failed: 1,
        };

        const result = await processEmailBatchHandler.handler(testEvent);
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(JSON.stringify(mResponse));
    });

    it('Send email: VALID all invalid emails', async () => {
        const reqBody = {
            // Some dummy values
            emails: [
                {
                    subject: 'invalid subject',
                    recipient: 'invalid-recipient@email.com',
                    fields: { invalid_field: 'invalid value' },
                },
                {
                    subject: 'invalid subject',
                    recipient: 'invalid-recipient@email.com',
                    fields: { invalid_field: 'invalid value' },
                },
                {
                    subject: 'invalid subject',
                    recipient: 'invalid-recipient@email.com',
                    fields: { invalid_field: 'invalid value' },
                },
            ],
        };

        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            body: JSON.stringify(reqBody),
            queryStringParameters: {
                templateid: 'valid-template-id',
            },
        });

        jest.spyOn(processEmailBatchHandler, 'validateEnv').mockReturnValue(true);
        const queueError = new ESCError(
            ErrorCode.ES17,
            `Send to queue error: ${JSON.stringify({
                subject: 'invalid subject',
                recipient: 'invalid-recipient@email.com',
                fields: { invalid_field: 'invalid value' },
            })}`,
        );
        jest.spyOn(processEmailBatchHandler, 'sendMessage').mockRejectedValue(
            new Promise(rejects => {
                rejects(queueError);
            }),
        );

        const mResponse = {
            processed: 0,
            failed: 3,
        };

        const result = await processEmailBatchHandler.handler(testEvent);
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(JSON.stringify(mResponse));
    });

    it('Send email: INVALID missing template id', async () => {
        const reqBody = {
            // Some dummy values
            emails: [
                {
                    subject: 'test subject',
                    recipient: 'test-recipient@email.com',
                    fields: { test_field: 'value1' },
                },
                {
                    subject: 'test subject 2',
                    recipient: 'test-recipient-2@email.com',
                    fields: { test_field: 'value2' },
                },
            ],
        };

        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            body: JSON.stringify(reqBody),
            queryStringParameters: {
                templateid: undefined,
            },
        });

        jest.spyOn(processEmailBatchHandler, 'validateEnv').mockReturnValue(true);

        const mResponse = {
            message: ErrorMessages.INVALID_REQUEST_FORMAT,
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
            message: ErrorMessages.INVALID_REQUEST_FORMAT,
            code: ErrorCode.ES18,
        };

        const result = await processEmailBatchHandler.handler(testEvent);
        expect(result.statusCode).toEqual(400);
        expect(result.body).toEqual(JSON.stringify(mResponse));
    });
});
