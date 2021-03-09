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

export interface IEmailAPIAuthReq {
    templateID: string;
    apiKey: string;
}
