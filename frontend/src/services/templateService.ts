import { RequestService } from './requestService';
import { PresignedPost } from '@aws-sdk/s3-presigned-post';
import {
    IGetTemplatesResponse,
    IGetTemplatesResponseItem,
    ITemplate,
    ITemplateDisplay,
    ITemplateMetadataUploadResponse,
    IUploadTemplateReqBody,
    IDeleteTemplateResponseBody,
    ITemplateWithHTML,
} from '../models/templateInterfaces';
import { ESCError } from '../models/iError';

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

        return this._requestService
            .POST('/templates', requestBody, (metadataResponse: ITemplateMetadataUploadResponse) =>
                this._uploadTemplateHTML(metadataResponse.imageUploadUrl, htmlFile).then(() => {
                    const timeCreated = parseInt(`${metadataResponse.timeCreated}`); // metadataResponse.timeCreated was actually a string...
                    return {
                        templateId: metadataResponse.templateId,
                        apiKey: metadataResponse.apiKey,
                        templateName: metadataResponse.templateName,
                        fieldNames: metadataResponse.fieldNames,
                        uploadTime: new Date(timeCreated),
                    };
                }),
            )
            .then(template => {
                const uploadTime = template.uploadTime.getTime();
                return this._requestService.PUT('/templates/' + template.templateId, { uploadTime: uploadTime }, r => {
                    return Promise.resolve(template);
                });
            });
    }

    private _uploadTemplateHTML(presignedPost: PresignedPost, htmlFile: any): Promise<void> {
        const formData = new FormData();
        const typedPresignedPost: { url: string; [key: string]: any } = presignedPost;
        Object.keys(presignedPost.fields).forEach(key => {
            formData.append(key, typedPresignedPost.fields[key]);
        });
        formData.set('Content-Type', 'text/html; charset=UTF-8');
        formData.append('file', htmlFile);
        return new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', typedPresignedPost.url, true);
            xhr.send(formData);
            xhr.onload = function () {
                if (this.status === 204) {
                    resolve();
                } else {
                    const uploadHtmlError = new ESCError('TS26', 'Upload template HTML failed');
                    reject(uploadHtmlError);
                }
            };
        });
    }

    public getTemplates(): Promise<Array<ITemplateDisplay>> {
        // TODO: Get request with start and limit? Maybe have to switch to POST
        // const requestBody: IGetTemplatesReqBody = {
        //     start: new Date(0).getTime().toString(),
        //     limit: 10,
        // };
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

    public getFilteredTemplates(searchKey: string): Promise<Array<ITemplateDisplay>> {
        return this._requestService.GET<ITemplateDisplay[]>('/templates?search=' + searchKey, (templateResponse: IGetTemplatesResponse) => {
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

    public getTemplateMetaData(templateId: string): Promise<ITemplateWithHTML> {
        return this._requestService.GET<ITemplateWithHTML>('/templates/' + templateId, (viewResponse: ITemplateWithHTML) => {
            return new Promise<ITemplateWithHTML>(resolve => {
                resolve(viewResponse);
            });
        });
    }

    public parseDocx(docx: File): Promise<[htmlFile: any, fieldNames: Array<string>]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject({ error: reader.error, message: reader.error });
            reader.onload = () => resolve(reader.result);
            reader.readAsArrayBuffer(docx);
        })
            .then(arrayBuffer => mammoth.convertToHtml({ arrayBuffer: arrayBuffer }))
            .then(resultObj => {
                const html: string = resultObj.value;
                return this._parseFieldsFromHTML(html);
            });
    }

    /**
     * Parses given html string and outputs dynamic field names in an array
     * @param html HTML string containing dynamic fields as ${...}
     */
    private _parseFieldsFromHTML(html: string): Promise<[htmlFile: any, fieldNames: Array<string>]> {
        const file = new File([html], 'templateHTML.html');

        return new Promise((resolve, reject) => {
            const dynamicFieldRegex = new RegExp(/\${(.*?)}/gm);
            let matches = dynamicFieldRegex.exec(html);
            const fields: Set<string> = new Set();
            while (matches) {
                const validRegex = new RegExp(/[A-Za-z_]+/m);
                const checkMatches = validRegex.exec(matches[1]);
                if (checkMatches === null || checkMatches[0].length !== matches[1].length) {
                    reject('Ill-formatted dynamic values. Accepted characters: [A-Za-z_].');
                }
                fields.add(matches[1]);
                matches = dynamicFieldRegex.exec(html);
            }
            resolve([file, Array.from(fields)]);
        });
    }

    public deleteTemplate(templateId: string): Promise<IDeleteTemplateResponseBody> {
        return this._requestService.DELETE<IDeleteTemplateResponseBody>(
            '/templates/' + templateId,
            (deleteResponse: IDeleteTemplateResponseBody) => {
                return new Promise<IDeleteTemplateResponseBody>(resolve => {
                    resolve(deleteResponse);
                });
            },
        );
    }
}
