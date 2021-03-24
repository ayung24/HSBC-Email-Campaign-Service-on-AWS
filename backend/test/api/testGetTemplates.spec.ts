import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../src/lambda/getTemplateMetadata'
import { EntryStatus, ITemplateFullEntry } from '../../src/database/dbInterfaces';
import { ApiGatewayProxyEventMockBuilder } from '../mocks/apiGatewayProxyEvent.mock';
import * as db from '../../src/database/dbOperations'
import { ErrorCode } from '../../src/errorCode';


describe('GET /templates/:id', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
      });

    it('View template details: valid template id', async () => {
        const mResponse: ITemplateFullEntry = {
            // Some dummy value
            templateId: 'test-id-1',
            timeCreated: 1616066356850,
            templateStatus: EntryStatus.IN_SERVICE,
            templateName: 'template1',
            apiKey: 'API-KEY',
            fieldNames: ['field1']
        }

        const testEvent:APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            pathParameters: {
                id: 'test-id-valid'
            }
        });
        const retrieveDataSpy = jest.spyOn(db, 'GetTemplateById').mockReturnValue(new Promise(resolve => {
            resolve(mResponse);
          }));

        const result = await handler(testEvent);
        expect(result.statusCode).toEqual(200);
        expect(result.body).toEqual(JSON.stringify(mResponse));
        expect(retrieveDataSpy).toBeCalledWith(testEvent.pathParameters!.id);
    });

    it('View template details: valid template id', async () => {
        const testEvent:APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            pathParameters: {
                id: 'non-existing-test-id'
            }
        });

        const mError = new Error(`No template with id ${testEvent.pathParameters!.id} found`)
        const mResponse = {
            message: `No template with id ${testEvent.pathParameters!.id} found`,
            code: ErrorCode.TS5,
        }

        const retrieveDataSpy = jest.spyOn(db, 'GetTemplateById').mockRejectedValue(mError);

        const result = await handler(testEvent);
        expect(result.statusCode).toEqual(400);
        expect(result.body).toEqual(JSON.stringify(mResponse));
        expect(retrieveDataSpy).toBeCalledWith(testEvent.pathParameters!.id);
    });
});


