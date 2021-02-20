export interface IUploadTemplateReqBody {
    name: string;
    html: string;
}

export interface IUploadTemplateResBody {
    templateId: string;
    name: string;
    timeCreated: string;
    imageUploadUrl: string;
}

export interface IListTemplatesBody {
    start: Date;
    limit: Date;
}
