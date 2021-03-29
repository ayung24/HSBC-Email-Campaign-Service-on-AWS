// a Entry is either deleted or not
export enum EntryStatus {
    IN_SERVICE = 'In Service',
    DELETED = 'Deleted',
}

// a base entry, used for list
export interface ITemplateBase {
    readonly templateId: string;
    readonly timeCreated: number;
    readonly templateStatus: EntryStatus;
    readonly templateName: string;
}

// a full entry, used for getting details
export interface ITemplateFullEntry extends ITemplateBase {
    readonly apiKey: string;
    readonly fieldNames: string[];
}

export interface ITemplateWithHTML extends ITemplateFullEntry {
    readonly html: string;
}

export interface ITemplateImage {
    contentType: string;
    content: Buffer;
    key: string;
}

export interface IImageUploadResult {
    key: string;
    location: string;
}

export interface IDeleteImagesResult {
    templateId: string;
    deletedCount: number;
}
