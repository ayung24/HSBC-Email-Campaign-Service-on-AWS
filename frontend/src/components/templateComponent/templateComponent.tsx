import React from 'react';
import { TemplateGridComponent } from '../templateGridComponent/templateGridComponent';
import { ToastComponentProperties, ToastInterface } from '../../models/toastInterfaces';
import { ToastComponent } from '../toastComponent/toastComponent';
import './templateComponent.css';
import { UploadTemplateModalComponent } from '../uploadTemplateModalComponent/uploadTemplateModalComponent';
import { Button, FormControl, Image } from 'react-bootstrap';
import searchIcon from '../../images/searchGlass.png';
import { ITemplateDisplay } from '../../models/templateInterfaces';

interface TemplateComponentState extends ToastComponentProperties {
    searchString: string;
}

export class TemplateComponent extends React.Component<any, TemplateComponentState> {
    private _toastMessages: Array<ToastInterface> = [];
    private readonly _toastComponent: React.RefObject<ToastComponent>;
    private readonly _uploadModalComponent: React.RefObject<UploadTemplateModalComponent>;
    private readonly _templateGridComponent: React.RefObject<TemplateGridComponent>;

    constructor(props = {}) {
        super(props);
        this._toastComponent = React.createRef();
        this._uploadModalComponent = React.createRef();
        this._templateGridComponent = React.createRef();
        this.state = { properties: this._toastMessages, searchString: '' };
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

    private _triggerTemplateFilter(searchString: string): void {
        this._templateGridComponent.current?.renderTemplates(searchString);
    }

    private _onSearchChange(event: React.SyntheticEvent): void {
        const input = event.target as HTMLInputElement;
        this.setState({ searchString: input.value.trim() });
    }

    private _renderLoadingRow(name: string): void {
        const templates: ITemplateDisplay[] = this._templateGridComponent.current?.getTemplates() ?? [];
        this._templateGridComponent.current?.addPendingTemplate({ templateId: name, templateName: name, uploadTime: undefined });
        this._templateGridComponent.current?.transformTemplates(templates);
    }

    private _handleUploadDone(id: string, name: string, timestamp: Date): void {
        const templates: ITemplateDisplay[] = this._templateGridComponent.current?.getTemplates() ?? [];
        templates.push({ templateId: id, templateName: name, uploadTime: timestamp });
        this._removeLoadingRowAndRefresh(templates, name);
    }

    private _handleUploadFail(name: string): void {
        const templates: ITemplateDisplay[] = this._templateGridComponent.current?.getTemplates() ?? [];
        this._removeLoadingRowAndRefresh(templates, name);
    }

    private _removeLoadingRowAndRefresh(newTemplates: ITemplateDisplay[], oldName: string): void {
        this._templateGridComponent.current
            ?.removePendingTemplate({ templateId: oldName, templateName: oldName, uploadTime: undefined })
            .then(() => this._templateGridComponent.current?.transformTemplates(newTemplates));
    }

    render(): JSX.Element {
        return (
            <div className='template-component'>
                <div className='template-header'>
                    <div className='template-header-left'>
                        <span className='template-grid-title'>All Templates</span>
                        <span className='template-search'>
                            <div className='search-bar'>
                                <FormControl
                                    id='searchFilterInput'
                                    placeholder='Search by template name'
                                    onChange={this._onSearchChange.bind(this)}
                                />
                                <div className='form-control-append'>
                                    <Button
                                        name='Search template'
                                        id='searchBtn'
                                        variant='outline-secondary'
                                        onClick={() => this._triggerTemplateFilter(this.state.searchString)}
                                    >
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
                <UploadTemplateModalComponent
                    ref={this._uploadModalComponent}
                    addPendingTemplate={this._renderLoadingRow.bind(this)}
                    removePendingTemplate={this._handleUploadFail.bind(this)}
                    handleUploadDone={this._handleUploadDone.bind(this)}
                    fileType={'.docx'}
                    addToast={this._addToast.bind(this)}
                />
                <div className='template-container'>
                    <TemplateGridComponent ref={this._templateGridComponent} addToast={this._addToast.bind(this)} />
                </div>
                <ToastComponent ref={this._toastComponent} properties={this.state.properties} removeToast={this._removeToast.bind(this)} />
            </div>
        );
    }
}
