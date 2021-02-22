// a Entry is either deleted or not
export enum EntryStatus {
    IN_SERVICE = 'In Service',
    DELETED = 'Deleted',
}

// what the tables are called in the environment
export enum TableName {
    METADATA = 'metadata',
    HTML = 'html',
}

// metadata Entries and html Entries have/share ID and status
export interface ITemplateComponent {
    readonly templateId: string;
    readonly status: EntryStatus;
}

// a metadata Entry, likely used for list
export interface IMetadataEntry extends ITemplateComponent {
    readonly name: string;
    readonly timeCreated: string;
}

// an html Entry, likely used for send email
export interface IHTMLEntry extends ITemplateComponent {
    readonly html: string;
    readonly fieldNames: string[];
    readonly apiKey: string;
}

// a detailed Entry for view template
// has to lookup info from both tables
export interface IDetailedEntry extends IMetadataEntry, IHTMLEntry {}

// a full Entry containing metadata, html, and images zip
export interface ITemplateEntry extends IDetailedEntry {
    readonly images?: any; // a zip
}

// returned by a database function
// it tells you if your attempt to access/change a Entry worked
export interface IDBResponse {
    readonly succeeded: boolean;
    readonly info: string;
}
