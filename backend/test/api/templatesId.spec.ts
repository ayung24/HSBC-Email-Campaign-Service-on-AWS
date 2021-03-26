import { APIGatewayProxyEvent } from 'aws-lambda';
import * as getTemplateMetadataHandler from '../../src/lambda/getTemplateMetadata';
import { EntryStatus, ITemplateFullEntry } from '../../src/database/dbInterfaces';
import { ApiGatewayProxyEventMockBuilder } from '../mocks/apiGatewayProxyEvent.mock';
import { ErrorCode, ESCError } from '../../src/ESCError';
import * as db from '../../src/database/dbOperations';

describe('GET /templates/:id', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('View template details: valid template id', async () => {
        const mResponse: ITemplateFullEntry = {
            // Some dummy values
            templateId: 'valid-test-id',
            timeCreated: 1616066356850,
            templateStatus: EntryStatus.IN_SERVICE,
            templateName: 'test template',
            apiKey: 'API-KEY',
            fieldNames: ['test-field1'],
        };
        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            pathParameters: {
                id: 'valid-test-id',
            },
        });
        const retrieveDataSpy = jest.spyOn(db, 'GetTemplateById').mockReturnValue(
            new Promise(resolve => {
                resolve(mResponse);
            }),
        );

        const result = await getTemplateMetadataHandler.handler(testEvent);
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(JSON.stringify(mResponse));
        expect(retrieveDataSpy).toBeCalledWith(testEvent.pathParameters!.id);
    });

    it('View template details: non-existing template id', async () => {
        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            pathParameters: {
                id: 'non-existing-test-id',
            },
        });
        const mError = new ESCError(ErrorCode.TS28, `No template with id ${testEvent.pathParameters!.id} found.`, true);
        const mResponse = {
            message: `No template with id ${testEvent.pathParameters!.id} found.`,
            code: ErrorCode.TS28,
        };
        const retrieveDataSpy = jest.spyOn(db, 'GetTemplateById').mockRejectedValue(mError);

        const result = await getTemplateMetadataHandler.handler(testEvent);
        expect(result.statusCode).toEqual(400);
        expect(result.body).toEqual(JSON.stringify(mResponse));
        expect(retrieveDataSpy).toBeCalledWith(testEvent.pathParameters!.id);
    });
});
