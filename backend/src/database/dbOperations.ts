import * as db from './interfaces';
import { v1 as uuid } from 'uuid';

const AWS = require('aws-sdk');

const NO_TABLE_ERROR = 'unable to access required table(s)';

export function AddTemplate(name: string, html: string, fieldNames: string[], apiKey: string): Promise<db.IDetailedEntry> {
    if (process.env.METADATA_TABLE_NAME === undefined || process.env.HTML_TABLE_NAME === undefined)
        return Promise.reject({ message: NO_TABLE_ERROR });

    let ddb = new AWS.DynamoDB({ apiVersion: '2019.11. 21' }); // current ver.
    return new Promise((resolve, reject) => {
        // check name uniqueness
        let isNameTakenQuery = {
            TableName: process.env.METADATA_TABLE_NAME,
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
                reject({ data: data, message: 'name not unique' })
            } else {
                resolve(data);
            }
        });
    }).then(() => {
        // add metadata entry
        let proposedMetadataEntry = {
            TableName: process.env.METADATA_TABLE_NAME,
            Item: {
                templateId: { S: uuid()}, // time based
                // timeAndStatus: generateTimeAndStatus(),
                timeCreated: {N: `${new Date().getTime()}`},
                templateStatus: {S: db.EntryStatus.IN_SERVICE},
                templateName: {S: name},
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
        let proposedHtmlEntry = {
            TableName: process.env.HTML_TABLE_NAME,
            Item: {
                templateId: { S: metadataEntry.templateId.S }, // time based
                html: {S: html},
                fieldNames: {SS: fieldNames},
                apiKey: {S: apiKey},
                templateStatus: {S: db.EntryStatus.IN_SERVICE},
            }
        }
        return new Promise((resolve, reject) => {
            ddb.putItem(proposedHtmlEntry, (err: any, data: any) => {
                if (err) {
                    // roll back metadata
                    ddb.deleteItem({
                        Key: {
                            templateId: { S: metadataEntry.templateId.S },
                            status: { S: metadataEntry.status.S },
                        },
                        TableName: process.env.METADATA_TABLE_NAME,
                    });
                    reject({ error: err, message: 'failed to add html' });
                } else {
                    let htmlEntry = proposedHtmlEntry.Item;
                    let finalEntry: db.IDetailedEntry = {
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
    if (process.env.METADATA_TABLE_NAME === undefined)
        return Promise.reject({ message: NO_TABLE_ERROR });
    return new Promise((resolve, reject) => {
        let ddb = new AWS.DynamoDB({ apiVersion: '2019.11. 21' }); // current ver.
        let queryParams = {
            IndexName: 'status-index',
            ExpressionAttributeValues: {
                ':startTime': { N: start.getTime().toString() },
                ':endTime': { N: end.getTime().toString() },
                ':inService': { S: db.EntryStatus.IN_SERVICE },
            },
            KeyConditionExpression: `templateStatus = :inService AND timeCreated BETWEEN :startTime AND :endTime`,
            TableName: process.env.METADATA_TABLE_NAME,
        }

        ddb.query(queryParams, (err: any, data: any) => {
            if (err) {
                reject({ error: err });
            }
            else {
                let result: any[] = data.Items;
                if (result.length < 1)
                    reject('no entries found');
                else
                {
                    let resultItems: any[] = new Array(data.Items.length);
                    for (let i = 0; i < data.Items.length; i++) {
                        let item = data.Items[i];
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
    let envTableName = `${table.toUpperCase()}_TABLE_NAME`;
    if (process.env[envTableName] === undefined)
        return Promise.reject({ message: NO_TABLE_ERROR });
    return new Promise((resolve, reject) => {
        let ddb = new AWS.DynamoDB({ apiVersion: '2019.11. 21' }); // current ver.
        let queryParams = {
            ExpressionAttributeValues: { ':id': { S: templateId } },
            KeyConditionExpression: `templateId = :id`,
            TableName: process.env[envTableName]
        }

        ddb.query(queryParams, (err: any, data: any) => {
            if (err) {
                reject({ error: err });
            }

            let dynamoResult: any[] = data.Items;
            if (dynamoResult.length < 1)
                reject('no entries found');

            let resultItem = data.Items[0];// assuming only one, since id is unique
            switch(table){
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
                    })
            }
        });
    });
}