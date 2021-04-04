import { RequestService } from './requestService';
import { IEmailParameters, ISendEmailReqBody, ISendEmailResponse } from '../models/emailInterfaces';

export class EmailService {
    private _requestService: RequestService;

    constructor() {
        this._requestService = new RequestService();
    }

    public sendEmail(params: IEmailParameters): Promise<ISendEmailResponse> {
        const requestBody: ISendEmailReqBody = {
            subject: params.subject,
            recipient: params.recipient,
            fields: params.fields,
        };
        return this._requestService.EMAIL(
            `/email/?templateid=${params.templateId}`,
            params.apiKey,
            requestBody,
            (response: ISendEmailResponse) => {
                return Promise.resolve(response);
            },
        );
    }

    public sendBatchEmail() {
        // TODO
    }
}
