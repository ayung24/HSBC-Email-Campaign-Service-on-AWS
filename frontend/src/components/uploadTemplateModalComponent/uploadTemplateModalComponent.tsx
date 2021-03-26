import React from 'react';
import './uploadTemplateModalComponent.css';
import { FileUploaderComponent } from '../fileUploaderComponent/fileUploaderComponent';
import { Button, Modal } from 'react-bootstrap';
import { createErrorMessage, ToastFunctionProperties, ToastInterface, ToastType } from '../../models/toastInterfaces';
import { TemplateService } from '../../services/templateService';
import { ITemplate } from '../../models/templateInterfaces';
import { IError, IErrorReturnResponse } from '../../models/iError';
import { SpinnerComponent, SpinnerState } from '../spinnerComponent/spinnerComponent';
import { EventEmitter } from '../../services/eventEmitter';

interface UploadModalState extends SpinnerState {
    dragging: boolean;
    file: File | null;
    isModalShown: boolean;
    templateName: string;
    htmlFile: any;
    fieldNames: Array<string>;
}

export class UploadTemplateModalComponent extends React.Component<ToastFunctionProperties, UploadModalState> {
    private _templateService: TemplateService;
    private _dragEventCounter = 0;
    private _addToast: (t: ToastInterface) => void;

    constructor(props: ToastFunctionProperties) {
        super(props);
        this._addToast = props.addToast;
        this.state = {
            dragging: false,
            file: null,
            isModalShown: false,
            templateName: '',
            htmlFile: undefined,
            fieldNames: [],
            isLoading: false,
        };
        this._templateService = new TemplateService();
    }

    public toggleModal(): void {
        this.setState({ isModalShown: !this.state.isModalShown });
    }

    private _closeModal(): void {
        this.setState({ file: null, templateName: '', htmlFile: undefined, fieldNames: [] });
        this.toggleModal();
    }

    private _dragEnterListener(event: React.DragEvent<HTMLDivElement>): void {
        this._overrideEventDefaults(event);
        this._dragEventCounter++;
        if (event.dataTransfer.items && event.dataTransfer.items[0]) {
            this.setState({ dragging: true });
        } else if (event.dataTransfer.types && event.dataTransfer.types[0] === 'Files') {
            // This block handles support for IE - if you're not worried about
            // that, you can omit this
            this.setState({ dragging: true });
        }
    }

    private _dragleaveListener(event: React.DragEvent<HTMLDivElement>): void {
        this._overrideEventDefaults(event);
        this._dragEventCounter--;

        if (this._dragEventCounter === 0) {
            this.setState({ dragging: false });
        }
    }

    private _dropListener(event: React.DragEvent<HTMLDivElement>): void {
        this._overrideEventDefaults(event);
        this._dragEventCounter = 0;
        this.setState({ dragging: false });

        if (event.dataTransfer.files && event.dataTransfer.files[0]) {
            this._handleUploadFile(event.dataTransfer.files[0]);
        }
    }

    private _overrideEventDefaults(event: Event | React.DragEvent<HTMLDivElement>): void {
        event.preventDefault();
        event.stopPropagation();
    }

    private _onFileChanged(event: React.ChangeEvent<HTMLInputElement>): void {
        if (event.target.files && event.target.files[0]) {
            this._handleUploadFile(event.target.files[0]);
        }
    }

    private _handleUploadFile(file: File): void {
        if (this._isValidFileType(file.type)) {
            this.setState({ file: file });
            this._templateService
                .parseDocx(file)
                .then(([htmlFile, fieldNames]) => {
                    this.setState({ htmlFile: htmlFile, fieldNames: fieldNames });
                })
                .catch(err => {
                    this._addToast({
                        id: 'parseDocxError',
                        body: `Could not parse word document file. Error: ${err}`,
                        type: ToastType.ERROR,
                        open: true,
                    });
                });
        } else {
            this._addToast(this._createFileTypeErrorToast(file));
        }
    }

    private _onTemplateNameChanged(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState({ templateName: event.target.value });
    }

    private _disableCreate(): boolean {
        return !this.state.file || this.state.templateName.trim().length === 0;
    }

    private _isValidFileType(fileType: string): boolean {
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' === fileType;
    }

    private _createFileTypeErrorToast(file: File): ToastInterface {
        return {
            id: 'wrongFileType',
            body: `Uploaded file [${file.name}] is invalid. Valid file types: [*.docx]`,
            type: ToastType.ERROR,
            open: true,
        };
    }

    private _createUploadErrorToast(err: IError, name: string): ToastInterface {
        const body = createErrorMessage(err, 'Could not upload template.');
        return {
            id: 'uploadTemplateError',
            body: body,
            type: ToastType.ERROR,
            open: true,
        };
    }

    private _createUploadSuccessToast(name: string): ToastInterface {
        return {
            id: `uploadTemplateSuccess-${name}`,
            body: `Template [${name}] uploaded successfully!`,
            type: ToastType.SUCCESS,
            open: true,
        };
    }

    private _doUpload(): void {
        if (this.state.htmlFile == undefined || this.state.htmlFile.size === 0) {
            this._addToast({
                id: 'emptyDocxError',
                body: `Cannot upload an empty template.`,
                type: ToastType.ERROR,
                open: true,
            });
        } else {
            this.setState({ isLoading: true });
            this._templateService
                .uploadTemplate(this.state.templateName, this.state.htmlFile, this.state.fieldNames)
                .then((t: ITemplate) => {
                    EventEmitter.getInstance().dispatch('refreshGrid');
                    this._addToast(this._createUploadSuccessToast(t.templateName));
                    this._closeModal();
                })
                .catch((err: IErrorReturnResponse) => {
                    this._addToast(this._createUploadErrorToast(err.response.data, this.state.templateName));
                })
                .finally(() => this.setState({ isLoading: false }));
        }
    }

    componentDidMount(): void {
        window.addEventListener('dragover', (event: Event) => {
            this._overrideEventDefaults(event);
        });
        window.addEventListener('drop', (event: Event) => {
            this._overrideEventDefaults(event);
        });
    }

    componentWillUnmount(): void {
        window.removeEventListener('dragover', this._overrideEventDefaults);
        window.removeEventListener('drop', this._overrideEventDefaults);
    }

    render(): JSX.Element {
        return (
            <div className='upload-container'>
                <Modal show={this.state.isModalShown} onHide={this._closeModal.bind(this)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>Upload new template</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className='upload-modal-body'>
                            <FileUploaderComponent
                                dragging={this.state.dragging}
                                file={this.state.file}
                                onDrag={this._overrideEventDefaults.bind(this)}
                                onDragStart={this._overrideEventDefaults.bind(this)}
                                onDragEnd={this._overrideEventDefaults.bind(this)}
                                onDragOver={this._overrideEventDefaults.bind(this)}
                                onDragEnter={this._dragEnterListener.bind(this)}
                                onDragLeave={this._dragleaveListener.bind(this)}
                                onDrop={this._dropListener.bind(this)}
                                onFileChanged={this._onFileChanged.bind(this)}
                            />
                            <div className='name-input-container'>
                                <label htmlFor='phone'>Name</label>
                                <input
                                    type='text'
                                    id='template-name'
                                    name='template-name'
                                    placeholder='Template Name'
                                    value={this.state.templateName}
                                    onChange={this._onTemplateNameChanged.bind(this)}
                                />
                            </div>
                            <Button className='create-template-button' disabled={this._disableCreate()} onClick={this._doUpload.bind(this)}>
                                Create
                            </Button>
                            {this.state.isLoading && <SpinnerComponent />}
                        </div>
                    </Modal.Body>
                </Modal>
            </div>
        );
    }
}
