import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../src/lambda/deleteTemplate';
import { EntryStatus, ITemplateBase, ITemplateFullEntry } from '../../src/database/dbInterfaces';
import { ApiGatewayProxyEventMockBuilder } from '../mocks/apiGatewayProxyEvent.mock';
import { ErrorCode, ESCError } from '../../src/ESCError';
import * as db from '../../src/database/dbOperations';

describe('DELETE /templates/:id', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('Delete template: valid template id', async () => {
        const mResponse: ITemplateBase = {
            // Some dummy values
            templateId: 'valid-test-id',
            timeCreated: 9999,
            templateStatus: EntryStatus.IN_SERVICE,
            templateName: 'templateId1'
        };
        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            pathParameters: {
                id: 'valid-test-id',
            },
        });
        const retrieveDataSpy = jest.spyOn(db, 'DeleteTemplateById').mockReturnValue(
            new Promise(resolve => {
                resolve(mResponse);
            }),
        );

        const result = await handler(testEvent);
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(JSON.stringify(mResponse));
        expect(retrieveDataSpy).toBeCalledWith(testEvent.pathParameters!.id);
    });

    it('Delete template: non-existing template id', async () => {
        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            pathParameters: {
                id: 'non-existing-test-id',
            },
        });
        const mError = new ESCError(ErrorCode.TS27, `No template with id ${testEvent.pathParameters!.id} found.`, true);
        const mResponse = {
            message: `No template with id ${testEvent.pathParameters!.id} found.`,
            code: ErrorCode.TS27,
        };
        const retrieveDataSpy = jest.spyOn(db, 'DeleteTemplateById').mockRejectedValue(mError);

        const result = await handler(testEvent);
        expect(result.statusCode).toEqual(400);
        expect(result.body).toEqual(JSON.stringify(mResponse));
        expect(retrieveDataSpy).toBeCalledWith(testEvent.pathParameters!.id);
    });

    it('Delete template: already deleted template', async () => {
        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            pathParameters: {
                id: 'deleted-template',
            },
        });
        const mError = new ESCError(ErrorCode.TS27, `No template with id ${testEvent.pathParameters!.id} found.`, true);
        const mResponse = {
            message: `No template with id ${testEvent.pathParameters!.id} found.`,
            code: ErrorCode.TS27,
        };
        const retrieveDataSpy = jest.spyOn(db, 'DeleteTemplateById').mockRejectedValue(mError);

        const result = await handler(testEvent);
        expect(result.statusCode).toEqual(400);
        expect(result.body).toEqual(JSON.stringify(mResponse));
        expect(retrieveDataSpy).toBeCalledWith(testEvent.pathParameters!.id);
    });
});