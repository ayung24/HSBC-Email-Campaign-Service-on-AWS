import { GetMetadataByID } from '../mocks/dbOperations.mock';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../src/lambda/getTemplateMetadata'
import { EntryStatus, ITemplateFullEntry } from '../../src/database/dbInterfaces';
import { ApiGatewayProxyEventMockBuilder } from '../mocks/apiGatewayProxyEvent.mock';


const headers = {
    'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    'Content-Type': 'application/json',
};


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
                id: 'test-id-1'
            }
        });

        const result = await handler(testEvent);
        const retrieveDataSpy = GetMetadataByID.mockResolvedValueOnce(mResponse);
        expect(result).toEqual({
            headers: headers,
            statusCode: 200,
            body: JSON.stringify(mResponse),
          });
        expect(retrieveDataSpy).toBeCalledWith('test-id-1');
    });
});


