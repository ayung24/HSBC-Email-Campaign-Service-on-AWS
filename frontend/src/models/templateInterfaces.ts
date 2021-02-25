import { PresignedPost } from '@aws-sdk/s3-presigned-post';

export interface ITemplate {
    templateId: string;
    apiKey: string;
    templateName: string;
    fieldNames: Array<string>;
    uploadTime: Date;
}

export interface ITemplateDisplay {
    templateId: string;
    templateName: string;
    uploadTime: Date;
}

export interface ITemplateMetadataUploadResponse {
    templateId: string;
    timeCreated: number;
    templateStatus: string,
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
