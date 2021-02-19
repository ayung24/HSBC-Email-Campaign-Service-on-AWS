import { Handler } from 'aws-lambda';
import * as db from '../../database/dbOperations';
import * as dbDefinitions from '../../database/interfaces';

// const AWS = require('aws-sdk');
// AWS.config.update({ region: 'ca-central-1' });

function test() {
    const testid = 'test0'
    let resultEntry: dbDefinitions.IMetadataEntry;
    let start = new Date();
    let end: Date;

    let final:any = {};
    return db.AddTemplate(testid, 'html', ['f1'], 'key').then((d) => {
        final.i = 0;
        return db.GetEntryByID(d.templateId, dbDefinitions.TableName.METADATA);
    }).then((entry: dbDefinitions.IMetadataEntry) => {
        resultEntry = entry;
        final.i = 1;
        return db.AddTemplate(testid + 2, 'html', ['f1'], 'key')
    }).then((d) => {
        end = new Date();
        final.i = 2;
        return db.AddTemplate(testid + 3, 'html', ['f1'], 'key')
    }).then((d) => {
        final.i = 3;
        return db.ListMetadataByDate(start, end);
    }).then((ds) => {
        final.list = {list: ds, first: resultEntry}
        return final;
    }).catch((err) => {
        final.err = err;
        return final;
    });
}


export const handler: Handler = async function (event) {
    // for db tests
    console.log('request:', JSON.stringify(event, undefined, 2));
    // const user = event.headers['Authorization'];

    let msg = await test();

    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*', // Required for CORS support to work
            'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            eventPath: event.path,
            test: msg,
            // user: user,
        }),
    };
};
