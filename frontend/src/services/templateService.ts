import { RequestService } from './requestService';
import { PresignedPost } from '@aws-sdk/s3-presigned-post';
import {
    IGetTemplatesReqBody,
    IGetTemplatesResponse,
    IGetTemplatesResponseItem,
    ITemplate,
    ITemplateDisplay,
    ITemplateMetadataUploadResponse,
    IUploadTemplateReqBody,
} from '../models/templateInterfaces';

const mammoth = require('mammoth');

export class TemplateService {
    private _requestService: RequestService;

    constructor() {
        this._requestService = new RequestService();
    }

    public uploadTemplate(name: string, htmlFile: any, fieldNames: Array<string>): Promise<ITemplate> {
        const requestBody: IUploadTemplateReqBody = {
            templateName: name,
            fieldNames: fieldNames,
        };
        return this._requestService.POST('/templates', requestBody, (metadataResponse: ITemplateMetadataUploadResponse) =>
            this._uploadTemplateHTML(metadataResponse.imageUploadUrl, htmlFile).then(() => {
                return {
                    templateId: metadataResponse.templateId,
                    apiKey: metadataResponse.apiKey,
                    templateName: metadataResponse.templateName,
                    fieldNames: metadataResponse.fieldNames,
                    uploadTime: new Date(metadataResponse.timeCreated),
                };
            }),
        );
    }

    private _uploadTemplateHTML(presignedPost: PresignedPost, htmlFile: any): Promise<void> {
        const formData = new FormData();
        const typedPresignedPost: { url: string; [key: string]: any } = presignedPost;
        Object.keys(presignedPost.fields).forEach(key => {
            formData.append(key, typedPresignedPost.fields[key]);
        });
        formData.append('file', htmlFile);
        formData.append('Content-Type', 'text/html; charset=UTF-8');
        return new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', typedPresignedPost.url, true);
            xhr.send(formData);
            xhr.onload = function () {
                this.status === 204 ? resolve() : reject(this.responseText);
            };
        });
    }

    public getTemplates(): Promise<Array<ITemplateDisplay>> {
        // TODO: Get request with start and limit? Maybe have to switch to POST
        const requestBody: IGetTemplatesReqBody = {
            start: new Date(0).getTime().toString(),
            limit: 10,
        };
        return this._requestService.GET<ITemplateDisplay[]>('/templates', (templateResponse: IGetTemplatesResponse) => {
            return new Promise<Array<ITemplateDisplay>>(resolve => {
                const templates = templateResponse.templates.map((template: IGetTemplatesResponseItem) => {
                    return {
                        templateId: template.templateId,
                        templateName: template.templateName,
                        uploadTime: new Date(parseInt(template.timeCreated)),
                    };
                });
                resolve(templates);
            });
        });
    }

    public parseDocx(docx: File): Promise<[htmlFile: any, fieldNames: Array<string>]> {
        let fieldNames: Array<string> = [];
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject({ error: reader.error, message: reader.error });
            reader.onload = () => resolve(reader.result);
            reader.readAsArrayBuffer(docx);
        })
            .then(arrayBuffer => mammoth.convertToHtml({ arrayBuffer: arrayBuffer }))
            .then(resultObj => {
                const html: string = resultObj.value;
                const file = new File([html], 'templateHTML.html');
                fieldNames = this._parseFieldsFromHTML(html);
                return [file, fieldNames];
            });
    }

    /**
     * Parses given html string and outputs dynamic field names in an array
     * @param html HTML string containing dynamic fields as ${...}
     */
    private _parseFieldsFromHTML(html: string): Array<string> {
        const dynamicFieldRegex = new RegExp(/\${(.*?)}/gm);
        let matches = dynamicFieldRegex.exec(html);
        const fields = [];
        while (matches) {
            fields.push(matches[1]);
            matches = dynamicFieldRegex.exec(html);
        }
        return fields;
    }
}
