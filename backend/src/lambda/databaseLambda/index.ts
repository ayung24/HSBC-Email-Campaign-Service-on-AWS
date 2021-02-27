import { Handler } from 'aws-lambda';
import * as db from '../../database/dbOperations';

function tryDBOperations() {
    const testName = 'test0';
    const start = new Date().getDate().toString();
    let end: string;

    const report: any = {};
    return db
        .AddTemplate(testName,['f1'],'key')
        .then(d => {
            report.i = 0;
            return db.GetMetadataByID(d.templateId);
        })
        .then(entry => {
            report.first = entry;
            report.i = 1;
            return db.AddTemplate(testName + 2,['f1'],'key');
        })
        .then(() => {
            end = new Date().getDate().toString();
            report.i = 2;
            return db.AddTemplate(testName + 3,['f1'],'key');
        })
        .then(() => {
            report.i = 3;
            return db.ListMetadataByDate(start, end);
        })
        .then(listResponse => {
            report.list = listResponse;
            return report;
        })
        .catch(err => {
            report.err = err;
            return report;
        });
}

export const handler: Handler = async function (event) {
    // for db tests
    console.log('request:', JSON.stringify(event, undefined, 2));
    // const user = event.headers['Authorization'];

    const msg = await tryDBOperations();

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
