// a record is either deleted or not
export enum RecordStatus {
    IN_SERVICE = 'In Service',
    DELETED = 'Deleted',
}

// metadata records and html records have/share ID and status
export interface ITemplateComponent {
    readonly TemplateID: string;
    readonly Status?: RecordStatus; // if not given, = IN_SERVICE
}

// a metadata record, likely used for list
export interface IMetadataRecord extends ITemplateComponent {
    readonly Name: string;
    readonly TimeCreated: Date;
}

// an html record, likely used for send email
export interface IHTMLRecord extends ITemplateComponent {
    readonly HTML: string;
    readonly FieldNames: string[];
    readonly APIKey: string;
}

// a detailed record for view template
// has to lookup info from both tables
export interface IDetailedRecord extends IMetadataRecord, IHTMLRecord {}

// a full record containing metadata, html, and images zip
export interface ITemplateRecord extends IDetailedRecord {
    readonly Images?: any; // a zip
}

// returned by a database function
// it tells you if your attempt to access/change a record worked
export interface IDBResponse {
    readonly Succeeded: boolean;
    readonly Info: string;
}
