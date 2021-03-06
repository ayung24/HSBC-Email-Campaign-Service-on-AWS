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
export interface IDeleteTemplateBody {
    templateId: string;
}
export interface ISendEmailReqBody {
    templateId: string;
    subject: string;
    recipient: string;
    fields: ISendEmailFields
}
export interface ISendEmailFields {
    [key: string]: string;
};

export interface IImageContent {
    contentType: string,
    content: Buffer,
    cid: string
};
