import * as db from '../../../src/database/dbOperations'
 // must be defined a mock before importing handler
jest.mock('../../../src/database/dbOperations', () => require('../../mocks/dbOperations.mock'));

import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../../src/lambda/uploadTemplate/index';
import { ApiGatewayProxyEventMockBuilder } from '../../mocks/apiGatewayProxyEvent.mock';

let testEvent: APIGatewayProxyEvent;
beforeEach(() => {
    jest.resetAllMocks();
    testEvent = ApiGatewayProxyEventMockBuilder({headers: {
        ["Authorization"]: "mockUser"
    }});
})

describe("upload handler tests", () => {
    it("should return error 400 if request body is not given", async () => {
        const res = await handler(testEvent);
        expect(res.statusCode).toBe(400);
    })

    it ("should return error 400 if template name exists", async () => {
        testEvent = ApiGatewayProxyEventMockBuilder({
            ... testEvent,
            body: JSON.stringify({
                name: "template1"
            })
        });
        (db.GetMetadataByName as jest.Mock).mockResolvedValueOnce({status: { succeeded: true, info: ""}})
        const res = await handler(testEvent);
        expect(res.statusCode).toBe(400);
    })

    it ("should call to add template metadata", async () => {
        const testName = "template1";
        testEvent = ApiGatewayProxyEventMockBuilder({
            ... testEvent,
            body: JSON.stringify({
                name: testName,
            })
        });
        (db.GetMetadataByName as jest.Mock).mockResolvedValueOnce({status: { succeeded: false, info: ""}});
        (db.AddMetadataEntry as jest.Mock).mockResolvedValueOnce({status: {succeeded: false, info: ""}});
        await handler(testEvent);
        expect(db.AddMetadataEntry).toHaveBeenCalledWith(testName);
    })

    it ("should return error 500 if adding template metadata fails", async () => {
        const testName = "template1";
        testEvent = ApiGatewayProxyEventMockBuilder({
            ... testEvent,
            body: JSON.stringify({
                name: testName,
            })
        });
        (db.GetMetadataByName as jest.Mock).mockResolvedValueOnce({status: { succeeded: false, info: ""}});
        (db.AddMetadataEntry as jest.Mock).mockResolvedValueOnce({status: {succeeded: false, info: ""}});
        const res = await handler(testEvent)
        expect(res.statusCode).toBe(500);
        expect(db.AddMetadataEntry).toHaveBeenCalledWith(testName);
    })

    it ("should call to add tempalte HTML with correct fields", async () => {
        const testName = "template1";
        const testHTML = `<p>Hello \${NAME},</p>
        <p>Your HSBC Mastercard is eligible for a credit limit increase of up to \${AMOUNT}.</p>
        <p>Please visit hsbc.ca/limit-increase and provide your promotion code: \${PROMO_CODE}.</p>
        <p>Thank you,</p>
        <p>HSBC Bank Canada</p>`
        const expectedFields = ['NAME', 'AMOUNT', 'PROMO_CODE']
        testEvent = ApiGatewayProxyEventMockBuilder({
            ... testEvent,
            body: JSON.stringify({
                name: testName,
                html: testHTML
            })
        });
        (db.GetMetadataByName as jest.Mock).mockResolvedValueOnce({status: { succeeded: false, info: ""}});
        (db.AddMetadataEntry as jest.Mock).mockResolvedValueOnce({
            status: {succeeded: true, info: ""},
            metadata: {templateID: 0, name: testName}
        });
        (db.AddHTMLEntry as jest.Mock).mockResolvedValueOnce({status: {succeeded: true, info: ''}})
        const res = await handler(testEvent)
        expect(db.AddMetadataEntry).toHaveBeenCalledWith(testName);
        expect(db.AddHTMLEntry).toHaveBeenCalledWith({
            html: testHTML,
            fieldNames: expectedFields,
            apiKey: '',
            templateID: 0
        })
    })
})