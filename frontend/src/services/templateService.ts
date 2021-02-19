import { RequestService } from './requestService';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
const mammoth = require('mammoth');

export class TemplateService {
    private _requestService: RequestService;

    constructor() {
        this._requestService = new RequestService();
    }

    public getTemplates(): Promise<any> {
        return this._requestService.GET('/helloWorld');
    }

    public _parseDocx(docx: File): [images: string[], html: string] {
        let html = '';
        const images: any[] = [];
        const file = docx;

        const reader = new FileReader();
        reader.onloadend = function () {
            const arrayBuffer = reader.result;
            mammoth.convertToHtml({ arrayBuffer: arrayBuffer }).then(function (resultObj: any) {
                html = resultObj.value;
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
                zip.generateAsync({ type: 'blob' }).then(function (blob: any) {
                    FileSaver.saveAs(blob, 'images.zip');
                });
            });
        };
        reader.readAsArrayBuffer(file);
        return [images, html];
    }
}
