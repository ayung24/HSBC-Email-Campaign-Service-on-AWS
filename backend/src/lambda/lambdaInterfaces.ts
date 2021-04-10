export interface IUploadTemplateReqBody {
    templateName: string;
    fieldNames: string[];
}

export interface IListTemplatesBody {
    start: string;
    limit: string;
}

export interface IDeleteTemplateBody {
    templateId: string;
}

export interface ISendEmailReqBody {
    subject: string;
    recipient: string;
    fields: ISendEmailFields;
}

export interface ISendEmailFields {
    [key: string]: string;
}

export interface IEmailQueueBody {
    templateId: string;
    subject: string;
    from: string;
    to: string;
    fields: ISendEmailFields;
}

export interface ILogEvent {
    message: string;
    timestamp: number;
}
