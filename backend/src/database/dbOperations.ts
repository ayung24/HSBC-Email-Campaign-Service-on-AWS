import * as db from './interfaces';
import { v4 as uuid } from 'uuid';
import * as AWS from 'aws-sdk';
import {IHTMLEntry, IMetadataEntry} from "./interfaces";

const METADATA_TABLE_NAME = process.env.METADATA_TABLE_NAME;
const HTML_TABLE_NAME = process.env.HTML_TABLE_NAME;

function getDynamo(): AWS.DynamoDB {
    return new AWS.DynamoDB({ apiVersion: process.env.DYNAMO_API_VERSION });
}

export function AddTemplate(name: string, html: string, fieldNames: string[], apiKey: string): Promise<db.IDetailedEntry> {
    const ddb: AWS.DynamoDB = getDynamo();
    console.log(`Adding template with name: ${name}, html: ${html}, fieldNames: ${fieldNames}, key: ${apiKey}`);
    return new Promise((resolve, reject) => {
        // check name uniqueness
        const isNameTakenQuery = {
            TableName: METADATA_TABLE_NAME,
            IndexName: 'name-index',
            ExpressionAttributeValues: {
                ':proposedName': { S: name },
            },
            KeyConditionExpression: 'templateName = :proposedName',
        };
        ddb.query(isNameTakenQuery, (err: AWS.AWSError, data: AWS.DynamoDB.QueryOutput) => {
            if (err) {
                console.log(`Name validation failure`);
                reject({ error: err, message: err.message });
            } else if (data.Count > 0) {
                console.log(`Name not unique`);
                reject({ info: data, message: 'name not unique' });
            } else {
                console.log(`Name validation success`);
                resolve(data);
            }
        });
    })
        .then(() => {
            // add metadata entry
            const proposedMetadataEntry: AWS.DynamoDB.PutItemInput = {
                TableName: METADATA_TABLE_NAME,
                Item: {
                    templateId: { S: uuid() }, // time based
                    // timeAndStatus: generateTimeAndStatus(),
                    timeCreated: { N: `${new Date().getTime()}` },
                    templateStatus: { S: db.EntryStatus.IN_SERVICE },
                    templateName: { S: name },
                },
            };
            // add html entry
            const proposedHtmlEntry = {
                TableName: HTML_TABLE_NAME,
                Item: {
                    templateId: { S: proposedMetadataEntry.Item.templateId.S }, // time based
                    html: { S: html },
                    fieldNames: { SS: fieldNames },
                    apiKey: { S: apiKey },
                    templateStatus: { S: db.EntryStatus.IN_SERVICE },
                },
            };
            return new Promise<[any, any]>(((resolve, reject) => {
                console.log("Adding template metadata and html");
                ddb.transactWriteItems({
                    TransactItems: [{ Put: proposedMetadataEntry }, { Put: proposedHtmlEntry }]
                }, (err: AWS.AWSError, data: AWS.DynamoDB.TransactWriteItemsOutput) => {
                    if (err) {
                        console.log("Add template failed");
                        reject({ error: err, message: 'Metadata or HTML add failed' });
                    } else {
                        console.log(`Add template success: ${proposedMetadataEntry.Item}`);
                        resolve([proposedMetadataEntry.Item, proposedHtmlEntry.Item]);
                    }
                })
            }));
        })
        .then(([metadataEntry, htmlEntry]) => {
            const finalEntry: db.IDetailedEntry = {
                templateId: metadataEntry.templateId.S,
                status: db.EntryStatus.IN_SERVICE,
                name: metadataEntry.templateName.S,
                timeCreated: metadataEntry.timeCreated.N,
                html: htmlEntry.html.S,
                fieldNames: htmlEntry.fieldNames.SS,
                apiKey: htmlEntry.apiKey.S,
            };
            return Promise.resolve(finalEntry);
        });
}

export function ListMetadataByDate(start: string, end: string): Promise<db.IMetadataEntry[]> {
    return new Promise((resolve, reject) => {
        const ddb = getDynamo();
        const queryParams = {
            IndexName: 'status-index',
            ExpressionAttributeValues: {
                ':startTime': { N: start },
                ':endTime': { N: end },
                ':inService': { S: db.EntryStatus.IN_SERVICE },
            },
            KeyConditionExpression: `templateStatus = :inService AND timeCreated BETWEEN :startTime AND :endTime`,
            TableName: METADATA_TABLE_NAME,
        };

        ddb.query(queryParams, (err: AWS.AWSError, data: AWS.DynamoDB.QueryOutput) => {
            if (err) {
                reject({ error: err, message: 'failed to list metadata' });
            } else {
                const items: AWS.DynamoDB.ItemList = data.Items;
                if (items.length < 1) {
                    reject({ error: null, message: 'no metadata entries found' });
                } else {
                    const result: db.IMetadataEntry[] = items.map((item: AWS.DynamoDB.AttributeMap) => {
                        return {
                            templateId: item.templateId.S,
                            status: db.EntryStatus[item.templateStatus.S],
                            name: item.templateName.S,
                            timeCreated: item.timeCreated.N,
                        };
                    });
                    resolve(result);
                }
            }
        });
    });
}

export function GetMetadataByID(templateId: string): Promise<db.IMetadataEntry> {
    const queryParams = {
        ExpressionAttributeValues: { ':id': { S: templateId } },
        KeyConditionExpression: `templateId = :id`,
        TableName: METADATA_TABLE_NAME,
    };

    return new Promise<db.IMetadataEntry>((resolve, reject) => {
        getDynamo().query(queryParams, (err: AWS.AWSError, data: AWS.DynamoDB.QueryOutput) => {
            if (err) {
                reject({ error: err, message: 'query failed' });
            }

            const dynamoResult: AWS.DynamoDB.ItemList = data.Items;
            if (dynamoResult.length < 1) reject({ error: null, message: `no metadata entry matching ${templateId} found` });

            const resultItem: AWS.DynamoDB.AttributeMap = data.Items[0]; // assuming only one, since id is unique
            resolve({
                templateId: templateId,
                status: db.EntryStatus[resultItem.templateStatus.S],
                name: resultItem.templateName.S,
                timeCreated: resultItem.timeCreated.N,
            });
        });
    });
}

export function GetHTMLByID(templateId: string): Promise<db.IHTMLEntry> {
    const queryParams = {
        ExpressionAttributeValues: { ':id': { S: templateId } },
        KeyConditionExpression: `templateId = :id`,
        TableName: HTML_TABLE_NAME,
    };
    return new Promise((resolve, reject) => {
        getDynamo().query(queryParams, (err: AWS.AWSError, data: AWS.DynamoDB.QueryOutput) => {
            if (err) {
                reject({ error: err, message: 'query failed' });
            }

            const dynamoResult: AWS.DynamoDB.ItemList = data.Items;
            if (dynamoResult.length < 1) reject({ message: 'no entries found' });

            const resultItem: AWS.DynamoDB.AttributeMap = data.Items[0]; // assuming only one, since id is unique
            resolve({
                templateId: templateId,
                status: db.EntryStatus[resultItem.templateStatus.S],
                html: resultItem.html.S,
                fieldNames: resultItem.fieldNames.SS,
                apiKey: resultItem.apiKey.S,
            });
        });
    });
}
