import React from 'react';
import { AmplifySignOut } from '@aws-amplify/ui-react';
import { TemplateGridComponent } from '../templateGridComponent/templateGridComponent';
import { TemplateService } from '../../services/templateService';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
const mammoth = require('mammoth');
import { ViewTemplateModalComponent } from '../viewTemplateModalComponent/viewTemplateModalComponent';
import { ToastComponentProperties, ToastInterfaces } from '../../models/toastInterfaces';
import { ToastComponent } from '../toastComponent/toastComponent';
import './templateComponent.css';

export class TemplateComponent extends React.Component<any, ToastComponentProperties> {
    private _service: TemplateService;
    private _toastMessages: Array<ToastInterfaces> = [];
    private readonly _toastComponent: React.RefObject<ToastComponent>;

    constructor(props = {}) {
        super(props);
        this._toastComponent = React.createRef();
        this.state = { properties: this._toastMessages };
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
    
    private _addToast(toast: ToastInterfaces): void {
        if (!this._toastMessages.some(messages => messages.id === toast.id)) {
            this._toastMessages.push(toast);
            this._toastComponent.current?.updateToasts(this._toastMessages);
        }
    }

    private _removeToast(id: string): void {
        const toastIndex = this._toastMessages.findIndex(toast => toast.id === id);
        if (toastIndex > -1) {
            this._toastMessages.splice(toastIndex, 1);
        }
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
                <TemplateGridComponent addToast={this._addToast.bind(this)} />
                <ViewTemplateModalComponent addToast={this._addToast.bind(this)} />
                <ToastComponent ref={this._toastComponent} properties={this.state.properties} removeToast={this._removeToast.bind(this)} />
            </div>
        );
    }
}
