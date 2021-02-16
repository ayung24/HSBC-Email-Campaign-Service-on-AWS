import * as db from './interfaces';

export function AddMetadataEntry(data: db.IMetadataRecord): db.IDBResponse {
    return { Succeeded: false, Info: `Not implemented but you gave ${JSON.stringify(data)}` };
}
