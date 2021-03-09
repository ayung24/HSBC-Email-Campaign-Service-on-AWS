import { v4 as uuid } from 'uuid';
import { EntryStatus, ITemplateBase, ITemplateFullEntry } from './dbInterfaces';
import { isEmpty, isEmptyArray } from '../commonFunctions';
import * as process from 'process';
import { AWSError, DynamoDB, S3 } from 'aws-sdk';
import { DeleteObjectOutput, GetObjectOutput } from 'aws-sdk/clients/s3';
import { UpdateItemOutput } from 'aws-sdk/clients/dynamodb';
import * as Logger from '../../logger';

const METADATA_TABLE_NAME = process.env.METADATA_TABLE_NAME;
const HTML_BUCKET_NAME = process.env.HTML_BUCKET_NAME;

function getDynamo(): DynamoDB {
    return new DynamoDB({ apiVersion: process.env.DYNAMO_API_VERSION });
}

function toSS(set: string[]): DynamoDB.StringSetAttributeValue {
    return isEmptyArray(set) ? [''] : set;
}

function fromSS(ss?: DynamoDB.StringSetAttributeValue): string[] {
    return ss && ss != [''] ? ss : [];
}

export function AddTemplate(name: string, fieldNames: string[], apiKey: string): Promise<ITemplateFullEntry> {
    const ddb: DynamoDB = getDynamo();
    Logger.info({
        message: 'Adding template',
        additionalInfo: {
            templateName: name,
            fieldNames: fieldNames.join(', '),
            apiKey: apiKey,
        },
    });
    return new Promise((resolve, reject) => {
        if (isEmpty(name) || isEmpty(apiKey)) {
            const fieldsEmptyError = new Error('Template name or api key is empty');
            Logger.logError(fieldsEmptyError);
            reject(fieldsEmptyError);
        } else {
            // check name uniqueness
            const isNameTakenQuery = {
                TableName: METADATA_TABLE_NAME!,
                IndexName: 'name-index',
                ExpressionAttributeValues: {
                    ':proposedName': { S: name },
                },
                KeyConditionExpression: 'templateName = :proposedName',
            };
            ddb.query(isNameTakenQuery, (err: AWSError, data: DynamoDB.QueryOutput) => {
                if (err) {
                    Logger.logError(err, 'Name validation failure');
                    reject(err);
                } else if (data.Count && data.Count > 0) {
                    const nameNotUniqueError = new Error(`Template name not unique: ${JSON.stringify(data)}`);
                    Logger.logError(nameNotUniqueError);
                    reject(nameNotUniqueError);
                } else {
                    resolve(data);
                }
            });
        }
    })
        .then(() => {
            // add metadata entry
            const proposedMetadataEntry: DynamoDB.PutItemInput = {
                TableName: METADATA_TABLE_NAME!,
                Item: {
                    templateId: { S: uuid() }, // time based
                    timeCreated: { N: `${new Date().getTime()}` },
                    templateStatus: { S: EntryStatus.IN_SERVICE },
                    templateName: { S: name },
                    apiKey: { S: apiKey },
                    fieldNames: { SS: toSS(fieldNames) }, // dynamoDB disallows empty Set
                },
            };
            Logger.info({
                message: 'Adding template to DynamoDB',
                additionalInfo: {
                    templateId: proposedMetadataEntry.Item.templateId.S,
                    templateName: name,
                    timeCreated: proposedMetadataEntry.Item.timeCreated.N,
                },
            });
            return new Promise<any>((resolve, reject) => {
                ddb.putItem(proposedMetadataEntry, (err: AWSError, data: DynamoDB.PutItemOutput) => {
                    if (err) {
                        Logger.logError(err);
                        reject(err);
                    } else {
                        resolve(proposedMetadataEntry.Item);
                    }
                });
            });
        })
        .then(metadataEntry =>
            Promise.resolve({
                templateId: metadataEntry.templateId.S,
                templateStatus: EntryStatus.IN_SERVICE,
                templateName: metadataEntry.templateName.S,
                timeCreated: metadataEntry.timeCreated.N,
                fieldNames: fromSS(metadataEntry.fieldNames.SS),
                apiKey: metadataEntry.apiKey.S,
            }),
        );
}

export function DeleteTemplateById(templateId: string): Promise<ITemplateBase> {
    const ddb: DynamoDB = getDynamo();
    Logger.info({ message: 'Deleting template', additionalInfo: { templateId: templateId } });
    if (isEmpty(templateId)) {
        const templateIdEmptyError = new Error('Template id is empty');
        Logger.logError(templateIdEmptyError);
        return Promise.reject(templateIdEmptyError);
    }
    return GetTemplateById(templateId)
        .then((entry: ITemplateFullEntry) => {
            Logger.info({ message: 'Deleting S3 HTML', additionalInfo: { templateId: templateId } });
            const s3 = new S3();
            const queryParams = {
                Bucket: HTML_BUCKET_NAME!,
                Key: templateId,
            };
            return new Promise<ITemplateFullEntry>((resolve, reject) => {
                s3.deleteObject(queryParams, (err: AWSError, data: DeleteObjectOutput) => {
                    if (err) {
                        Logger.logError(err);
                        reject(err);
                    } else {
                        resolve(entry);
                    }
                });
            });
        })
        .then((entry: ITemplateFullEntry) => {
            Logger.info({ message: 'Setting metadata status to Deleted', additionalInfo: { templateId: templateId } });
            return new Promise<any>((resolve, reject) => {
                const deleteEntry: DynamoDB.UpdateItemInput = {
                    TableName: METADATA_TABLE_NAME!,
                    Key: {
                        templateId: {
                            S: templateId,
                        },
                        timeCreated: {
                            N: `${entry.timeCreated}`,
                        },
                    },
                    UpdateExpression: 'set templateStatus = :status',
                    ExpressionAttributeValues: {
                        ':status': { S: EntryStatus.DELETED },
                    },
                    ReturnValues: 'ALL_NEW',
                };
                ddb.updateItem(deleteEntry, (err: AWSError, data: UpdateItemOutput) => {
                    if (err) {
                        Logger.logError(err);
                        reject(err);
                    } else {
                        resolve(data.Attributes);
                    }
                });
            });
        })
        .then(attributeMap =>
            Promise.resolve<ITemplateBase>({
                templateId: attributeMap.templateId.S,
                templateStatus: attributeMap.templateStatus.S,
                templateName: attributeMap.templateName.S,
                timeCreated: attributeMap.timeCreated.N,
            }),
        );
}

export function ListTemplatesByDate(start: string, end: string): Promise<ITemplateBase[]> {
    const ddb = getDynamo();
    Logger.info({ message: 'Retrieving all templates', additionalInfo: undefined });
    return new Promise((resolve, reject) => {
        const queryParams = {
            IndexName: 'status-index',
            ExpressionAttributeValues: {
                ':startTime': { N: start },
                ':endTime': { N: end },
                ':inService': { S: EntryStatus.IN_SERVICE },
            },
            KeyConditionExpression: `templateStatus = :inService AND timeCreated BETWEEN :startTime AND :endTime`,
            TableName: METADATA_TABLE_NAME!,
        };
        ddb.query(queryParams, (err: AWSError, data: DynamoDB.QueryOutput) => {
            if (err) {
                Logger.logError(err);
                reject(err);
            } else {
                const items = data.Items;
                if (!items || items.length < 0) {
                    const undefinedItemsError = new Error('Retrieved undefined items from database');
                    Logger.logError(undefinedItemsError);
                    reject(undefinedItemsError);
                } else {
                    const results: ITemplateBase[] = items.map((item: DynamoDB.AttributeMap) => {
                        return {
                            templateId: item.templateId.S!,
                            timeCreated: Number.parseInt(item.timeCreated.N!),
                            templateStatus: (<any>EntryStatus)[item.templateStatus.S!],
                            templateName: item.templateName.S!,
                        };
                    });
                    resolve(results);
                }
            }
        });
    });
}

export function GetTemplateById(templateId: string): Promise<ITemplateFullEntry> {
    const ddb = getDynamo();
    Logger.info({ message: 'Getting template metadata', additionalInfo: { templateId: templateId } });
    const queryParams = {
        ExpressionAttributeValues: { ':id': { S: templateId } },
        KeyConditionExpression: `templateId = :id`,
        TableName: METADATA_TABLE_NAME!,
    };
    return new Promise<ITemplateFullEntry>((resolve, reject) => {
        ddb.query(queryParams, (err: AWSError, data: DynamoDB.QueryOutput) => {
            if (err) {
                Logger.logError(err);
                reject(err);
            } else {
                const dynamoResult = data.Items;
                if (!dynamoResult || dynamoResult.length < 1) {
                    const noTemplateError = new Error(`No template with id ${templateId} found`);
                    Logger.logError(noTemplateError);
                    reject(noTemplateError);
                } else {
                    const item: DynamoDB.AttributeMap = dynamoResult[0]; // assuming only one, since id is unique
                    resolve({
                        templateId: item.templateId.S!,
                        timeCreated: Number.parseInt(item.timeCreated.N!),
                        templateStatus: (<any>EntryStatus)[item.templateStatus.S!],
                        templateName: item.templateName.S!,
                        apiKey: item.apiKey.S!,
                        fieldNames: fromSS(item.fieldNames.SS),
                    });
                }
            }
        });
    });
}

export function GetHTMLById(templateId: string): Promise<string> {
    const s3 = new S3();
    Logger.info({ message: 'Getting template HTML', additionalInfo: { templateId: templateId } });
    const queryParams = {
        Bucket: HTML_BUCKET_NAME!,
        Key: templateId,
    };
    return new Promise((resolve, reject) => {
        s3.getObject(queryParams, (err: AWSError, data: GetObjectOutput) => {
            if (err) {
                Logger.logError(err);
                reject(err);
            } else {
                const result = data.Body?.toString('utf-8');
                if (!result || isEmpty(result)) {
                    const noItemError = new Error(`No HTML with template id ${templateId} found`);
                    Logger.logError(noItemError);
                    reject(noItemError);
                } else {
                    resolve(result);
                }
            }
        });
    });
}
