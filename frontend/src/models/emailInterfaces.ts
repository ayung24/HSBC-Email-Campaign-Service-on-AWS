export interface IEmailParameters {
    templateId: string;
    apiKey: string;
    subject: string;
    recipient: string;
    fields: ISendEmailFields;
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
    messageId: string;
}

export interface IBatchSendReqBody {
    emails: Array<IEmailParameters>
}

