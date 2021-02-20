import { promises } from 'dns';
import * as db from './interfaces';

export function AddMetadataEntry(name: string): Promise<{ status: db.IDBResponse; metadata?: db.IMetadataEntry }> {
    return Promise.resolve({ status: { succeeded: false, info: `Not implemented` } });
    // metadata: {templateID: name: "name", timeCreated: new Date(), status: db.EntryStatus.IN_SERVICE}});
}

export function GetMetadataByID(id: string): Promise<{ status: db.IDBResponse; metadata?: db.IMetadataEntry }> {
    return Promise.resolve({ status: { succeeded: false, info: `Not implemented` } });
}

export function ListMetadataByDate(start: Date, end: Date): Promise<{ status: db.IDBResponse; metadataList?: db.IMetadataEntry[] }> {
    return Promise.resolve({ status: { succeeded: false, info: `Not implemented` } });
}

export function GetMetadataByName(name: string): Promise<{ status: db.IDBResponse; metadataList?: db.IMetadataEntry }> {
    return Promise.resolve({ status: { succeeded: false, info: `Not implemented` } });
}

// add metadata to get templateID
export function AddHTMLEntry(htmlEntry: db.IHTMLEntry): Promise<{ status: db.IDBResponse }> {
    return Promise.resolve({ status: { succeeded: false, info: `Not implemented` } });
}

export function GetHTMLByID(id: string): Promise<{ status: db.IDBResponse; html?: db.IHTMLEntry }> {
    return Promise.resolve({ status: { succeeded: false, info: `Not implemented` } });
}
