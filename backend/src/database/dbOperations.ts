import * as db from './interfaces';
import { v1 as uuid } from 'uuid';

const AWS = require('aws-sdk');

const NO_TABLE_ERROR = 'unable to access required table(s)';

export function AddTemplate(name: string, html: string, fieldNames: string[], apiKey: string): Promise<db.IDetailedEntry> {
    if (process.env[db.TableName.METADATA] === undefined || process.env[db.TableName.HTML] === undefined)
        return Promise.reject({ message: NO_TABLE_ERROR });

    const ddb = new AWS.DynamoDB(process.env.dynamoConfig); // current ver.
    return new Promise((resolve, reject) => {
        // check name uniqueness
        const isNameTakenQuery = {
            TableName: process.env[db.TableName.METADATA],
            IndexName: 'name-index',
            ExpressionAttributeValues: {
                ":proposedName": { S: name }
            },
            KeyConditionExpression: "templateName = :proposedName",
        }
        ddb.query(isNameTakenQuery, (err: any, data: any) => {
            if (err) {
                reject({ error: err, message: 'error while checking name uniqueness' });
            } else if (data.Count > 0) {
                reject({ info: data, message: 'name not unique' });
            } else {
                resolve(data);
            }
        });
    }).then(() => {
        // add metadata entry
        const proposedMetadataEntry = {
            TableName: process.env[db.TableName.METADATA],
            Item: {
                templateId: { S: uuid() }, // time based
                // timeAndStatus: generateTimeAndStatus(),
                timeCreated: { N: `${new Date().getTime()}` },
                templateStatus: { S: db.EntryStatus.IN_SERVICE },
                templateName: { S: name },
            }
        }
        return new Promise((resolve, reject) => {
            ddb.putItem(proposedMetadataEntry, (err: any, data: any) => {
                if (err) {
                    reject({ error: err, message: 'failed to add metadata' });
                } else {
                    resolve(proposedMetadataEntry.Item);
                }
            });
        })
    }).then((metadataEntry: any) => {
        // add html entry
        const proposedHtmlEntry = {
            TableName: process.env[db.TableName.HTML],
            Item: {
                templateId: { S: metadataEntry.templateId.S }, // time based
                html: { S: html },
                fieldNames: { SS: fieldNames },
                apiKey: { S: apiKey },
                templateStatus: { S: db.EntryStatus.IN_SERVICE },
            }
        }
        return new Promise((resolve, reject) => {
            ddb.putItem(proposedHtmlEntry, (err: any, data: any) => {
                if (err) {
                    // roll back metadata
                    ddb.deconsteItem({
                        Key: {
                            templateId: { S: metadataEntry.templateId.S },
                            status: { S: metadataEntry.status.S },
                        },
                        TableName: process.env[db.TableName.METADATA],
                    });
                    reject({ error: err, message: 'failed to add html' });
                } else {
                    const htmlEntry = proposedHtmlEntry.Item;
                    const finalEntry: db.IDetailedEntry = {
                        templateId: metadataEntry.templateId.S,
                        status: db.EntryStatus.IN_SERVICE,
                        name: metadataEntry.templateName.S,
                        timeCreated: new Date(metadataEntry.timeCreated.N),
                        html: htmlEntry.html.S,
                        fieldNames: htmlEntry.fieldNames.SS,
                        apiKey: htmlEntry.apiKey.S,
                    }
                    resolve(finalEntry);
                }
            });
        });
    });
}

export function ListMetadataByDate(start: Date, end: Date): Promise<db.IMetadataEntry[]> {
    if (process.env[db.TableName.METADATA] === undefined)
        return Promise.reject({ message: NO_TABLE_ERROR });
    return new Promise((resolve, reject) => {
        const ddb = new AWS.DynamoDB(process.env.dynamoConfig);
        const queryParams = {
            IndexName: 'status-index',
            ExpressionAttributeValues: {
                ':startTime': { N: start.getTime().toString() },
                ':endTime': { N: end.getTime().toString() },
                ':inService': { S: db.EntryStatus.IN_SERVICE },
            },
            KeyConditionExpression: `templateStatus = :inService AND timeCreated BETWEEN :startTime AND :endTime`,
            TableName: process.env[db.TableName.METADATA],
        }

        ddb.query(queryParams, (err: any, data: any) => {
            if (err) {
                reject({ error: err });
            }
            else {
                const result: any[] = data.Items;
                if (result.length < 1)
                    reject({ message: 'no entries found' });
                else {
                    const resultItems: any[] = new Array(data.Items.length);
                    for (let i = 0; i < data.Items.length; i++) {
                        const item = data.Items[i];
                        resultItems[i] = {
                            templateId: item.templateId,
                            status: item.templateStatus,
                            name: item.templateName,
                            timeCreated: new Date(item.timeCreated),
                        }
                    }
                    resolve(resultItems);
                }
            }
        });
    });
}

export function GetEntryByID(templateId: string, table: db.TableName): Promise<db.IMetadataEntry | db.IHTMLEntry> {
    const envTableName = table;
    if (process.env[envTableName] === undefined)
        return Promise.reject({ message: NO_TABLE_ERROR });
    return new Promise((resolve, reject) => {
        const ddb = new AWS.DynamoDB({ apiVersion: '2019.11. 21' }); // current ver.
        const queryParams = {
            ExpressionAttributeValues: { ':id': { S: templateId } },
            KeyConditionExpression: `templateId = :id`,
            TableName: process.env[envTableName],
        }

        ddb.query(queryParams, (err: any, data: any) => {
            if (err) {
                reject({ error: err, message: 'query failed' });
            }

            const dynamoResult: any[] = data.Items;
            if (dynamoResult.length < 1)
                reject({ message: 'no entries found' });

            const resultItem = data.Items[0];// assuming only one, since id is unique
            switch (table) {
                case db.TableName.METADATA:
                    resolve({
                        templateId: resultItem.temaplateId,
                        status: resultItem.templateStatus,
                        name: resultItem.templateName,
                        timeCreated: new Date(resultItem.timeCreated),
                    });
                    break;
                case db.TableName.HTML:
                    resolve({
                        templateId: resultItem.temlpateId,
                        status: resultItem.templateStatus,
                        html: resultItem.html,
                        fieldNames: resultItem.fieldNames,
                        apiKey: resultItem.apiKey,
                    });
                    break;
                default:
                    reject({ message: 'unrecognized table' });
            }
        });
    });
}