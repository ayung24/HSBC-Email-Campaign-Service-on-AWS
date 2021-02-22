import { RequestService } from './requestService';
import JSZip from 'jszip';
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

    public uploadTemplate(name: string, html: string, images: any): Promise<ITemplate> {
        const requestBody: IUploadTemplateReqBody = {
            name: name,
            html: html,
        };
        return this._requestService.POST('/templates', requestBody, (metadataResponse: ITemplateMetadataUploadResponse) =>
            this._uploadTemplateImages(metadataResponse.imageUploadUrl, images).then(() => {
                return {
                    id: metadataResponse.templateId,
                    apiKey: metadataResponse.apiKey,
                    name: metadataResponse.name,
                    params: metadataResponse.fieldNames,
                    uploadTime: new Date(parseInt(metadataResponse.timeCreated)),
                };
            }),
        );
    }

    private _uploadTemplateImages(presignedPost: PresignedPost, images: any): Promise<any> {
        const formData = new FormData();
        const typedPresignedPost: { url: string; [key: string]: any } = presignedPost;
        Object.keys(presignedPost.fields).forEach(key => {
            formData.append(key, typedPresignedPost.fields[key]);
        });
        formData.append('file', images);
        formData.append('Content-Type', 'binary/octet-stream');
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
                        id: template.templateId,
                        name: template.name,
                        uploadTime: new Date(parseInt(template.timeCreated)),
                    };
                });
                resolve(templates);
            });
        });
    }

    public parseDocx(docx: File): Promise<[images: any, html: string]> {
        let html = '';
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject({ error: reader.error, message: reader.error });
            reader.onload = () => resolve(reader.result);
            reader.readAsArrayBuffer(docx);
        })
            .then(arrayBuffer => mammoth.convertToHtml({ arrayBuffer: arrayBuffer }))
            .then(resultObj => {
                html = resultObj.value;

                // TODO: Link images somehow?
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const imgs = doc.getElementsByTagName('img');
                for (let i = 0; i < imgs.length; i++) {
                    const img = imgs[i];
                    img.src = 'blank.jpg';
                }
                html = doc.documentElement.outerHTML;

                const images: any[] = [];
                const imageRegExp = /"[^"]+"/g;
                const allImages = html.match(imageRegExp) || '';

                // image format is "data:image/{imageType};base64, {imageData}"
                for (const image of allImages) {
                    if (image.includes('data:image')) {
                        const imageData = image.slice(image.indexOf(',') + 1, image.length);
                        const imageType = image.slice(image.indexOf('/') + 1, image.indexOf(';'));
                        images.push([imageType, imageData]);
                    }
                }
                const zip = new JSZip();
                let count = 0;
                for (const img of images) {
                    zip.file('images/image' + count + '.' + img[0], img[1], { base64: true });
                    count++;
                }
                return zip.generateAsync({ type: 'blob' });
            })
            .then(blob => [blob, html]);
    }
}
