export interface IUploadTemplateReqBody {
    templateName: string;
    fieldNames: string[];
}

export interface IUploadTemplateResBody {
    templateId: string;
    name: string;
    timeCreated: string;
    imageUploadUrl: string;
}

export interface IListTemplatesBody {
    start: string;
    limit: string;
}

export interface IEmailAPIAuthReqBody {
    templateId: string;
    apiKey: string;
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