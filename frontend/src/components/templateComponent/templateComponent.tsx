import React from 'react';
import './templateComponent.css';
import { AmplifySignOut } from '@aws-amplify/ui-react';
import { TemplateService } from '../../services/templateService';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
const mammoth = require('mammoth');

export class TemplateComponent extends React.Component {
    private _service: TemplateService;

    constructor(props = {}) {
        super(props);
        this._service = new TemplateService();
    }

    // TODO: Uncomment when ready (i.e. we have a prod environment set up for the backend APIs)
    // componentDidMount(): void {
    //     this._service.getTemplates();
    // }

    convertDocxFile(input: React.ChangeEvent<HTMLInputElement>): void {
        const files = input.target.files || [];
        if (!files.length) return;
        const file = files[0];

        const reader = new FileReader();
        reader.onloadend = function () {
            const arrayBuffer = reader.result;
            mammoth.convertToHtml({ arrayBuffer: arrayBuffer }).then(function (resultObj: any) {
                const result1 = document.querySelector('#result1');
                if (result1) {
                    result1.innerHTML = resultObj.value;
                }
                const html = resultObj.value;
                const regExp = /"[^"]+"/g;
                const allImages = html.match(regExp);
                const images = [];
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
                zip.generateAsync({ type: 'blob' }).then(function (blob) {
                    FileSaver.saveAs(blob, 'images.zip');
                });
            });
        };
        reader.readAsArrayBuffer(file);
    }

    render(): JSX.Element {
        return (
            <div className='template-component'>
                <div className='signout'>
                    <AmplifySignOut />
                </div>
                <div className='upload-container'>
                    <h4 className='upload-desc'>Please choose a template file to upload. Accepted file format: .docx</h4>
                    <input type='file' onChange={this.convertDocxFile.bind(this)} />
                </div>
            </div>
        );
    }
}
