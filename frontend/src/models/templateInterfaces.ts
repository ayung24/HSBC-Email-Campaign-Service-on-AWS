import { PresignedPost } from '@aws-sdk/s3-presigned-post';

export interface ITemplate {
    id: string;
    apiKey: string;
    name: string;
    params: Array<string>;
    uploadTime: Date;
}

export interface ITemplateDisplay {
    id: string;
    name: string;
    uploadTime: Date;
}

export interface ITemplateMetadataUploadResponse {
    templateId: string;
    name: string;
    apiKey: string;
    fieldNames: string[];
    timeCreated: string;
    imageUploadUrl: PresignedPost;
}

export interface IUploadTemplateReqBody {
    name: string;
    html: string;
}
