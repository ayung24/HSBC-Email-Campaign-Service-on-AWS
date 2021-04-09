import React from 'react';
import { TemplateGridComponent } from '../templateGridComponent/templateGridComponent';
import { ToastComponentProperties, ToastInterface } from '../../models/toastInterfaces';
import { ToastComponent } from '../toastComponent/toastComponent';
import './templateComponent.css';
import { UploadTemplateModalComponent } from '../uploadTemplateModalComponent/uploadTemplateModalComponent';
import { Button, FormControl, Image, InputGroup } from 'react-bootstrap';
import searchIcon from '../../images/searchGlass.png';

export class TemplateComponent extends React.Component<any, ToastComponentProperties> {
    private _toastMessages: Array<ToastInterface> = [];
    private readonly _toastComponent: React.RefObject<ToastComponent>;
    private readonly _uploadModalComponent: React.RefObject<UploadTemplateModalComponent>;

    constructor(props = {}) {
        super(props);
        this._toastComponent = React.createRef();
        this._uploadModalComponent = React.createRef();
        this.state = { properties: this._toastMessages };
    }

    private _addToast(toast: ToastInterface): void {
        this._toastMessages = this._toastMessages.filter(messages => messages.id !== toast.id);
        this._toastMessages.push(toast);
        this._toastComponent.current?.updateToasts(this._toastMessages);
    }

    private _removeToast(id: string): void {
        const toastIndex = this._toastMessages.findIndex(toast => toast.id === id);
        if (toastIndex > -1) {
            this._toastMessages.splice(toastIndex, 1);
        }
    }

    private _toggleUploadModal(): void {
        this._uploadModalComponent.current?.toggleModal();
    }

    render(): JSX.Element {
        return (
            <div className='template-component'>
                <div className='template-header'>
                    <div className='template-header-left'>
                        <span className='template-grid-title'>All Templates</span>
                        <span className='template-search'>
                            <div className='search-bar'>
                                <input className='form-control' placeholder='Search template' />
                                <div className='form-control-append'>
                                    <Button name='Search template' id='searchBtn' variant='outline-secondary'>
                                        <Image src={searchIcon} alt='search icon' fluid />
                                    </Button>
                                </div>
                            </div>
                        </span>
                    </div>
                    <div className='uploadBtn'>
                        <Button className='upload-button' size='lg' onClick={this._toggleUploadModal.bind(this)}>
                            UPLOAD +
                        </Button>
                    </div>
                </div>
                <UploadTemplateModalComponent ref={this._uploadModalComponent} fileType={'.docx'} addToast={this._addToast.bind(this)} />
                <div className='template-container'>
                    <TemplateGridComponent addToast={this._addToast.bind(this)} />
                </div>
                <ToastComponent ref={this._toastComponent} properties={this.state.properties} removeToast={this._removeToast.bind(this)} />
            </div>
        );
    }
}
