import * as db from './dbOperations';
import { IDBResponse, IMetadataEntry } from './interfaces';

export const handler = async (event: any = {}): Promise<any> => {
    // body of some lambda handler
    return db.AddMetadataEntry('test').then(result => {
        console.log(`add succeeded?: ${result.status.succeeded},
        info: ${result.status.info}`);
    });
};
