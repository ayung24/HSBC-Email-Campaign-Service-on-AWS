import React from 'react';
import { AmplifySignOut } from '@aws-amplify/ui-react';
import { TemplateGridComponent } from '../templateGridComponent/templateGridComponent';
import { TemplateService } from '../../services/templateService';
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
                    <input type='file' />
                </div>
                <TemplateGridComponent addToast={this._addToast.bind(this)} />
                <ViewTemplateModalComponent addToast={this._addToast.bind(this)} />
                <ToastComponent ref={this._toastComponent} properties={this.state.properties} removeToast={this._removeToast.bind(this)} />
            </div>
        );
    }
}
