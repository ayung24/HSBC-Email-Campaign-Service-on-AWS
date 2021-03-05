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

export interface ISendEmailReqBody {
    templateId: string;
    subject: string;
    recipient: string;
    fields: SendEmailFields
}

export type SendEmailFields = {
    [key: string]: string;
};
