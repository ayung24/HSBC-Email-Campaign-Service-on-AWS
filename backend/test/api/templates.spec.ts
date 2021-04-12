import { APIGatewayProxyEvent } from 'aws-lambda';
import * as uploadTemplateHandler from '../../src/lambda/uploadTemplate';
import { EntryStatus, ITemplateFullEntry } from '../../src/database/dbInterfaces';
import { ApiGatewayProxyEventMockBuilder } from '../mocks/apiGatewayProxyEvent.mock';
import { ErrorCode, ErrorMessages, ESCError } from '../../src/ESCError';
import * as db from '../../src/database/dbOperations';

describe('POST /templates', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('Upload: valid request with unique name, no dynamic fields', async () => {
        const templateId = 'valid-test-id';
        const templateName = 'test template';
        const fieldNames: string[] = [];
        const encryptedApiKey = 'encrypted';
        const url = { url: 'url', fields: {} };
        const addTemplateResponse: ITemplateFullEntry = {
            // Some dummy values
            templateId: templateId,
            timeCreated: 1616066356850,
            templateStatus: EntryStatus.IN_SERVICE,
            templateName: templateName,
            apiKey: 'API-KEY',
            fieldNames: fieldNames,
        };

        const handlerResponse = {
            // Some dummy values
            templateId: templateId,
            timeCreated: 1616066356850,
            templateStatus: EntryStatus.IN_SERVICE,
            templateName: templateName,
            apiKey: 'API-KEY',
            fieldNames: fieldNames,
            imageUploadUrl: url,
        };

        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            body: JSON.stringify({
                templateName: templateName,
                fieldNames: fieldNames,
            }),
        });

        const retrieveDataSpyCreatePresignedPostS3 = jest.spyOn(uploadTemplateHandler, 'createPresignedPostS3').mockReturnValue(
            new Promise(resolve => {
                resolve(url);
            }),
        );
        jest.spyOn(uploadTemplateHandler, 'validateEnv').mockReturnValue(true);
        jest.spyOn(uploadTemplateHandler, 'kmsEncrypt').mockReturnValue(
            new Promise(resolve => {
                resolve(encryptedApiKey);
            }),
        );

        const retrieveDataSpyAddTemplate = jest.spyOn(db, 'AddTemplate').mockReturnValue(
            new Promise(resolve => {
                resolve(addTemplateResponse);
            }),
        );

        const result = await uploadTemplateHandler.handler(testEvent);
        expect(result.statusCode).toEqual(200);
        const actual = JSON.parse(result.body);
        expect(actual).toEqual(handlerResponse);
        // Check parameters of calls
        expect(retrieveDataSpyCreatePresignedPostS3).toBeCalledWith(templateId);
        expect(retrieveDataSpyAddTemplate).toHaveBeenCalledWith(templateName, fieldNames, encryptedApiKey);
    });

    it('Upload: valid request with unique name, multiple dynamic fields', async () => {
        const templateId = 'valid-test-id';
        const templateName = 'test template';
        const fieldNames: string[] = ['FIELD1', 'FIELD2', 'FIELD3'];
        const encryptedApiKey = 'encrypted';
        const url = { url: 'url', fields: {} };
        const addTemplateResponse: ITemplateFullEntry = {
            // Some dummy values
            templateId: templateId,
            timeCreated: 1616066356850,
            templateStatus: EntryStatus.IN_SERVICE,
            templateName: templateName,
            apiKey: 'API-KEY',
            fieldNames: fieldNames,
        };

        const handlerResponse = {
            // Some dummy values
            templateId: templateId,
            timeCreated: 1616066356850,
            templateStatus: EntryStatus.IN_SERVICE,
            templateName: templateName,
            apiKey: 'API-KEY',
            fieldNames: fieldNames,
            imageUploadUrl: url,
        };

        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            body: JSON.stringify({
                templateName: templateName,
                fieldNames: fieldNames,
            }),
        });

        const retrieveDataSpyCreatePresignedPostS3 = jest.spyOn(uploadTemplateHandler, 'createPresignedPostS3').mockReturnValue(
            new Promise(resolve => {
                resolve(url);
            }),
        );
        jest.spyOn(uploadTemplateHandler, 'validateEnv').mockReturnValue(true);
        jest.spyOn(uploadTemplateHandler, 'kmsEncrypt').mockReturnValue(
            new Promise(resolve => {
                resolve(encryptedApiKey);
            }),
        );

        const retrieveDataSpyAddTemplate = jest.spyOn(db, 'AddTemplate').mockReturnValue(
            new Promise(resolve => {
                resolve(addTemplateResponse);
            }),
        );

        const result = await uploadTemplateHandler.handler(testEvent);
        expect(result.statusCode).toEqual(200);
        const actual = JSON.parse(result.body);
        expect(actual).toEqual(handlerResponse);
        // Check parameters of calls
        expect(retrieveDataSpyCreatePresignedPostS3).toBeCalledWith(templateId);
        expect(retrieveDataSpyAddTemplate).toHaveBeenCalledWith(templateName, fieldNames, encryptedApiKey);
    });

    it('Upload: invalid requests with missing request body field', async () => {
        const templateName = 'test template';
        const encryptedApiKey = 'encrypted';
        const mResponse = {
            // Some dummy values
            message: ErrorMessages.INTERNAL_SERVER_ERROR,
            code: ErrorCode.TS32,
        };
        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            body: JSON.stringify({
                templateName: templateName,
            }),
        });

        jest.spyOn(uploadTemplateHandler, 'validateEnv').mockReturnValue(true);
        jest.spyOn(uploadTemplateHandler, 'kmsEncrypt').mockReturnValue(
            new Promise(resolve => {
                resolve(encryptedApiKey);
            }),
        );

        const result = await uploadTemplateHandler.handler(testEvent);
        expect(result.statusCode).toEqual(500);
        expect(result.body).toEqual(JSON.stringify(mResponse));
    });

    it('Upload: invalid request with non-unique name', async () => {
        const templateName = 'non-unique-name';
        const fieldNames: string[] = ['FIELD1'];
        const encryptedApiKey = 'encrypted';
        const mResponse = {
            // Some dummy values
            message: `Template name [${templateName}] is not unique.`,
            code: ErrorCode.TS17,
        };
        const testEvent: APIGatewayProxyEvent = ApiGatewayProxyEventMockBuilder({
            body: JSON.stringify({
                templateName: templateName,
                fieldNames: fieldNames,
            }),
        });

        jest.spyOn(uploadTemplateHandler, 'validateEnv').mockReturnValue(true);
        jest.spyOn(uploadTemplateHandler, 'kmsEncrypt').mockReturnValue(
            new Promise(resolve => {
                resolve(encryptedApiKey);
            }),
        );

        const retrieveDataSpy = jest.spyOn(db, 'AddTemplate').mockImplementation(() => {
            throw new ESCError(ErrorCode.TS17, `Template name [${templateName}] is not unique.`, true);
        });

        const result = await uploadTemplateHandler.handler(testEvent);
        expect(result.statusCode).toEqual(400);
        expect(result.body).toEqual(JSON.stringify(mResponse));
        // Check parameters of calls
        expect(retrieveDataSpy).toHaveBeenCalledWith(templateName, fieldNames, encryptedApiKey);
    });
});
