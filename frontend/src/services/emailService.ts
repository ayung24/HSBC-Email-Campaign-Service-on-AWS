import { RequestService } from './requestService';
import {
    ISendParameters,
    IBatchSendParameters,
    ISendEmailReqBody,
    IBatchSendReqBody,
    ISendEmailResponse,
    IBatchSendResponse,
} from '../models/emailInterfaces';
import XLSX from 'xlsx';
export class EmailService {
    private _requestService: RequestService;

    constructor() {
        this._requestService = new RequestService();
    }

    public sendEmail(params: ISendParameters): Promise<ISendEmailResponse> {
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

    public sendBatchEmail(params: IBatchSendParameters): Promise<IBatchSendResponse> {
        const requestBody: IBatchSendReqBody = {
            emails: params.emails,
        };
        return this._requestService.EMAIL(
            `/emailBatch/?templateid=${params.templateId}`,
            params.apiKey,
            requestBody,
            (response: IBatchSendResponse) => {
                return Promise.resolve(response);
            },
        );
    }

    public parseCsv(csv: File): Promise<[jsonData: any[], csvFieldNames: Array<string>]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject({ error: reader.error, message: reader.error });
            reader.onload = function (event: any) {
                if (event.target) {
                    const data = event.target.result;
                    const workbook = XLSX.read(data, {
                        type: 'binary',
                        raw: true,
                    });
                    let jsonData: any[] = [];
                    const csvFieldNames: string[] = [];
                    workbook.SheetNames.forEach(function (sheetName: any) {
                        const rowObj: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                        jsonData = rowObj;
                        Object.keys(rowObj[0]).forEach(key => {
                            if (key !== 'Recipient' && key !== 'Subject') {
                                csvFieldNames.push(key);
                            }
                        });
                    });
                    resolve([jsonData, csvFieldNames]);
                }
            };
            reader.readAsBinaryString(csv);
        });
    }

    public static isEmailValid(email: string): boolean {
        // https://regexr.com/3e48o
        const REGEX = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
        return REGEX.test(email);
    }
}
