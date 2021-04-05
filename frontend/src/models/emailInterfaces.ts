export interface IEmailParameters {
    subject: string;
    recipient: string;
    fields: ISendEmailFields;
}

export interface ISendParameters extends IEmailParameters {
    templateId: string;
    apiKey: string;
}
export interface IBatchSendParameters {
    templateId: string;
    apiKey: string;
    emails: Array<IEmailParameters>;
}

export interface ISendEmailFields {
    [key: string]: string;
}

export interface ISendEmailReqBody {
    subject: string;
    recipient: string;
    fields: ISendEmailFields;
}

export interface ISendEmailResponse {
    templateId: string;
    sender: string;
    recipient: string;
}

export interface IBatchSendReqBody {
    emails: Array<IEmailParameters>;
}

export interface IBatchSendResponse {
    templateId: string;
    processed: number;
    failed: number;
}
