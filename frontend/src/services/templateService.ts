import { RequestService } from './requestService';
import JSZip from 'jszip';
import { PresignedPost } from '@aws-sdk/s3-presigned-post';
import { ITemplate, ITemplateDisplay, ITemplateMetadataUploadResponse, IUploadTemplateReqBody } from '../models/templateInterfaces';

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
        // TODO: Call backend
        // return this._requestService.GET('/templates', templateResponse => {
        //     return new Promise<Array<ITemplateDisplay>>(resolve => []);
        // });
        return new Promise<Array<ITemplateDisplay>>(resolve => {
            // Returns an error
            // throw new Error('error');
            // Returns list
            resolve([
                { id: '12345', name: 'Test Template', uploadTime: new Date(1412970153123) },
                { id: '1232', name: 'Test 2 Template', uploadTime: new Date(1612970153114) },
                { id: '12452', name: 'Test 3 Template', uploadTime: new Date(1611560133124) },
                { id: '13452', name: 'Test 4 Template', uploadTime: new Date(1616770153124) },
                { id: '23452', name: 'Test 5 Template', uploadTime: new Date(1510970153124) },
                { id: '1234123', name: 'Test 6 Template', uploadTime: new Date(1612970153124) },
                { id: '12312321', name: 'Test 7 Template', uploadTime: new Date(1612970153124) },
                { id: '875', name: 'Test 8 Template', uploadTime: new Date(612070153124) },
                { id: '58', name: 'Test 9 Template', uploadTime: new Date(652970153124) },
                { id: '587', name: 'Test 10 Template', uploadTime: new Date(121297053124) },
                { id: '5897', name: 'Test 2 Template', uploadTime: new Date(112970153124) },
                { id: '1342', name: 'Test 2 Template', uploadTime: new Date(11129701524) },
                { id: '5364', name: 'Test 2 Template', uploadTime: new Date(112970153124) },
                { id: '356', name: 'Test 2 Template', uploadTime: new Date(1012970153124) },
                { id: '36', name: 'Test 2 Template', uploadTime: new Date(92970153124) },
                { id: '53649', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '3654', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '5786', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '4635', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '78', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '786', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '567', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '576', name: 'Test Template', uploadTime: new Date(1612970153123) },
                { id: '2346', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '43', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '432', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '10', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '9', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '8', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '1293452', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '17452', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '1023452', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '1238452', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
            ]);
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
