// import will just be 'database' since its a node module
import * as db from './dbOperations'; 

export const handler = async (event: any = {}): Promise<any> => {
    // body of some lambda handler
    return db.AddMetadataEntry('test').then((result) => {
        console.log(`add succeeded?: ${result.status.succeeded},
        info: ${result.status.info}`);
    });
};
