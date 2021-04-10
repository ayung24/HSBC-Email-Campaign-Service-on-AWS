import { PresignedPost } from '@aws-sdk/s3-presigned-post';

export interface ITemplate {
    templateId: string;
    apiKey: string;
    templateName: string;
    fieldNames: Array<string>;
    uploadTime: Date;
}

export interface ITemplateWithHTML extends ITemplate {
    html: string;
}

export interface ITemplateDisplay {
    templateId: string;
    templateName: string;
    uploadTime: Date | undefined;
}

export interface ITemplateMetadataUploadResponse {
    templateId: string;
    timeCreated: number;
    templateStatus: string;
    templateName: string;
    apiKey: string;
    fieldNames: Array<string>;
    imageUploadUrl: PresignedPost;
}

export interface IUploadTemplateReqBody {
    templateName: string;
    fieldNames: Array<string>;
}

export interface IGetTemplatesReqBody {
    start: string;
    limit: number;
}

export interface IGetTemplatesResponse {
    templates: IGetTemplatesResponseItem[];
}

export interface IGetTemplatesResponseItem {
    templateId: string;
    templateName: string;
    timeCreated: string;
}

export interface IDeleteTemplateResponseBody {
    templateId: string;
}

export interface IGetTemplateLogsResponseBody {
    events: Array<IEmailEventLog>;
}

export interface IEmailEventLogsWithTimezone {
    events: Array<IEmailEventLogWithTimezone>;
}

export interface IEmailEventLogWithTimezone {
    timestamp: string;
    event: IEmailEvent;
}

export interface IEmailEventLog {
    timestamp: number;
    event: IEmailEvent;
}

export interface IEmailEvent {
    eventType: string;
    mail: any;
}
