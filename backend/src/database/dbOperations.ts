import { v4 as uuid } from 'uuid';
import { EntryStatus, ITemplateBase, ITemplateFullEntry } from './dbInterfaces';
import { isEmpty, isEmptyArray } from '../commonFunctions';
import * as process from 'process';
import { AWSError, DynamoDB, S3 } from 'aws-sdk';
import { GetObjectOutput } from 'aws-sdk/clients/s3';

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
    console.info(`Adding template with name: ${name}, fieldNames: ${fieldNames}, key: ${apiKey}`);
    return new Promise((resolve, reject) => {
        if (isEmpty(name) || isEmpty(apiKey)) {
            const error = new Error('Template name or api key is empty');
            reject({ error: error, message: error.message });
        }
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
                console.info(`Name validation failure`);
                reject({ error: err, message: err.message });
            } else if (data.Count && data.Count > 0) {
                console.info(`Name not unique`);
                const err = new Error(`Template name not unique: ${JSON.stringify(data)}`);
                reject({ error: err, message: err.message });
            } else {
                console.info(`Name validation success`);
                resolve(data);
            }
        });
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
            return new Promise<any>((resolve, reject) => {
                console.info('Adding template to dynamo');
                ddb.putItem(proposedMetadataEntry, (err: AWSError, data: DynamoDB.PutItemOutput) => {
                    if (err) {
                        console.info('Add template failed');
                        reject({ error: err, message: 'Add template failed' });
                    } else {
                        console.info(`Add template success: ${JSON.stringify(proposedMetadataEntry.Item)}`);
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

export function ListMetadataByDate(start: string, end: string): Promise<ITemplateBase[]> {
    const ddb = getDynamo();
    console.info(`Getting all templates`);
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
                reject({ error: err, message: 'Failed to get templates from database' });
            }
            const items = data.Items;
            if (!items || items.length < 0) {
                const error = new Error('Failed to get templates from database');
                reject({ error: error, message: error.message });
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
        });
    });
}

export function GetMetadataByID(templateId: string): Promise<ITemplateFullEntry> {
    const ddb = getDynamo();
    const queryParams = {
        ExpressionAttributeValues: { ':id': { S: templateId } },
        KeyConditionExpression: `templateId = :id`,
        TableName: METADATA_TABLE_NAME!,
    };
    return new Promise<ITemplateFullEntry>((resolve, reject) => {
        ddb.query(queryParams, (err: AWSError, data: DynamoDB.QueryOutput) => {
            if (err) {
                reject({ error: err, message: `Failed to get template ${templateId} from database` });
            }
            const dynamoResult = data.Items;
            if (!dynamoResult || dynamoResult.length < 1) {
                const error = new Error(`No template with id ${templateId} found`);
                reject({ error: error, message: error.message });
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
        });
    });
}

export function GetHTMLByID(templateId: string): Promise<string> {
    const s3 = new S3();
    const queryParams = {
        Bucket: HTML_BUCKET_NAME!,
        Key: templateId,
    };
    return new Promise((resolve, reject) => {
        s3.getObject(queryParams, (err: AWSError, data: GetObjectOutput) => {
            if (err) {
                reject({ error: err, message: `Failed to get HTML with template id ${templateId} from bucket` });
            }
            const result = data.Body?.toString('utf-8');
            if (!result || isEmpty(result)) {
                const error = new Error(`No HTML with template id ${templateId} found`);
                reject({ error: error, message: error.message });
            } else {
                resolve(result);
            }
        });
    });
}
