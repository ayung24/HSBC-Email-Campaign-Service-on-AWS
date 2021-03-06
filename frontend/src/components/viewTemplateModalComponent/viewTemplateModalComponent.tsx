import React from 'react';
import './viewTemplateModalComponent.css';
import copyImage from '../../images/copyText.png';
import copiedImage from '../../images/copiedText.png';
import arrowIcon from '../../images/arrow.png';
import toolsIcon from '../../images/tools.png';
import { ToastFunctionProperties, ToastInterface, ToastType } from '../../models/toastInterfaces';
import { Image, Button, Modal, Tabs, Tab, InputGroup, FormControl, Form } from 'react-bootstrap/';
import { TemplateService } from '../../services/templateService';
import { SpinnerComponent, SpinnerState } from '../spinnerComponent/spinnerComponent';
import { EventEmitter } from '../../services/eventEmitter';

interface ViewModalState extends SpinnerState {
    isViewOpen: boolean;
    url: string;
    apiKey: string;
    jsonBody: string;
    fieldNames: any[];
}

interface ViewTemplateModalProperties extends ToastFunctionProperties {
    templateId: string;
    templateName: string;
    timeCreated: string;
}

export class ViewTemplateModalComponent extends React.Component<ViewTemplateModalProperties, ViewModalState> {
    private _addToast: (t: ToastInterface) => void;
    private _templateService: TemplateService;

    constructor(props: ViewTemplateModalProperties) {
        super(props);
        this._addToast = props.addToast;
        this._templateService = new TemplateService();
        this.state = {
            isViewOpen: false,
            url: '',
            apiKey: '',
            jsonBody: '',
            fieldNames: [],
            isLoading: false,
        };
        this._templateService = new TemplateService();
    }

    private _handleModalClose(): void {
        this.setState({ isViewOpen: false });
    }

    private _handleModalOpen(): void {
        this.getTemplateFieldNames();
    }

    private getTemplateFieldNames(): void {
        const templateId = this.props.templateId;
        const templateName = this.props.templateName;
        this.setState({ isLoading: true }, () => {
            this._templateService
                .getTemplateMetaData(templateId)
                .then(response => {
                    this._addToast(this._getTemplateFieldNamesSuccessToast(templateName));
                    this.setState({ fieldNames: response.fieldNames });
                    this.setState({ isViewOpen: true });
                })
                .catch((err: any) => {
                    this._addToast(this.__getTemplateFieldNamesErrorToast(err, templateName));
                })
                .finally(() => this.setState({ isLoading: false }));
        });
    }

    private __getTemplateFieldNamesErrorToast(err: any, templateName: string): ToastInterface {
        return {
            id: `getTemplateFieldNamesError-${err.response}`,
            body: `An error occured when getting field names for template [${templateName}]. Error: ${err.response}`,
            type: ToastType.ERROR,
            open: true,
        };
    }

    private _getTemplateFieldNamesSuccessToast(templateName: string): ToastInterface {
        return {
            id: `getTemplateFieldNamesSuccess-${templateName}`,
            body: `Template [${templateName}] field names retrieved successfully!`,
            type: ToastType.SUCCESS,
            open: true,
        };
    }

    private _copyText(text: string, event: any): any {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        event.target.src = copiedImage;
        document.body.removeChild(textArea);
    }

    private _renderFieldNames(): any {
        const fieldNames = this.state.fieldNames;
        return fieldNames.map((fieldName, index) => (
            <div key={fieldName + index}>
                <Form.Label key={fieldName + index}>{fieldName}</Form.Label>
                <InputGroup className='mb-3'>
                    <FormControl key={fieldName + index} placeholder={'Field Name ' + (index + 1)} />
                </InputGroup>
            </div>
        ));
    }

    private _deleteTemplate(): void {
        const templateId = this.props.templateId;
        this.setState({ isLoading: true }, () => {
            this._templateService
                .deleteTemplate(templateId)
                .then(response => {
                    EventEmitter.getInstance().dispatch('refreshGrid');
                    const toast = {
                        id: 'deleteTemplatesSuccess',
                        body: 'Successfully deleted template: ' + response.templateId + '.',
                        type: ToastType.SUCCESS,
                        open: true,
                    };
                    this._addToast(toast);
                    this._handleModalClose();
                })
                .catch(() => {
                    const toast = {
                        id: 'deleteTemplatesError',
                        body: 'Could not delete template: ' + templateId + '.',
                        type: ToastType.ERROR,
                        open: true,
                    };
                    this._addToast(toast);
                })
                .finally(() => this.setState({ isLoading: false }));
        });
    }

    render(): JSX.Element {
        return (
            <div>
                <Button id='tools' variant='outline-dark' onClick={() => this._handleModalOpen()}>
                    <Image src={toolsIcon} alt='tools icon' />
                </Button>
                <Modal id='viewModal' show={this.state.isViewOpen} scrollable onHide={() => this._handleModalClose()}>
                    <Modal.Header>
                        <div className='headerDiv'>
                            <Button id='arrow' variant='outline-dark' onClick={() => this._handleModalClose()}>
                                <Image src={arrowIcon} alt='arrow icon' fluid />
                            </Button>
                            <Button
                                variant='outline-dark'
                                className='float-right'
                                onClick={this._deleteTemplate.bind(this)}
                                style={{ marginTop: '12px' }}
                            >
                                Delete
                            </Button>
                            <Modal.Title>{this.props.templateName}</Modal.Title>
                            <span>Created at {this.props.timeCreated}</span>
                        </div>
                    </Modal.Header>
                    <Modal.Body id='body'>
                        <Tabs defaultActiveKey='single'>
                            <Tab id='single' eventKey='single' title='Single'>
                                <div className='sendParameters'>
                                    <Form.Label>Recipient</Form.Label>
                                    <InputGroup id='recipient' className='mb-3'>
                                        <FormControl placeholder='Recipient' />
                                    </InputGroup>
                                    <Form.Label>Subject</Form.Label>
                                    <InputGroup id='subject' className='mb-3'>
                                        <FormControl placeholder='Subject' />
                                    </InputGroup>
                                </div>
                                <div className='dynamicParameters'> {this._renderFieldNames()}</div>
                            </Tab>
                            <Tab id='batch' eventKey='batch' title='Batch'>
                                <div className='sendParameters'>
                                    <Form.Label>Recipient</Form.Label>
                                    <InputGroup id='recipient' className='mb-3'>
                                        <FormControl placeholder='Recipient' />
                                    </InputGroup>
                                    <Form.Label>Subject</Form.Label>
                                    <InputGroup id='subject' className='mb-3'>
                                        <FormControl placeholder='Subject' />
                                    </InputGroup>
                                </div>
                                <div className='dynamicParameters'> {this._renderFieldNames()}</div>
                            </Tab>
                        </Tabs>
                    </Modal.Body>
                    <Modal.Footer id='footer'>
                        <Form.Label>URL</Form.Label>
                        <InputGroup className='mb-3'>
                            <FormControl disabled placeholder='URL' onChange={event => this.setState({ url: event.target.value })} />
                            <InputGroup.Append>
                                <Button id='copyBtn' variant='outline-secondary'>
                                    <Image src={copyImage} alt='copy icon' onClick={event => this._copyText(this.state.url, event)} fluid />
                                </Button>
                            </InputGroup.Append>
                        </InputGroup>
                        <Form.Label>API Key</Form.Label>
                        <InputGroup className='mb-3'>
                            <FormControl disabled placeholder='API Key' onChange={event => this.setState({ apiKey: event.target.value })} />
                            <InputGroup.Append>
                                <Button id='copyBtn' variant='outline-secondary'>
                                    <Image
                                        src={copyImage}
                                        alt='copy icon'
                                        onClick={event => this._copyText(this.state.apiKey, event)}
                                        fluid
                                    />
                                </Button>
                            </InputGroup.Append>
                        </InputGroup>
                        <div className='updateBtnDiv'>
                            <Form.Label>Body</Form.Label>
                            <Button id='updateBtn' variant='outline-secondary'>
                                Update Preview
                            </Button>
                        </div>
                        <InputGroup className='mb-5'>
                            <FormControl
                                disabled
                                as='textarea'
                                aria-label='With textarea'
                                style={{ minHeight: '46px' }}
                                onChange={event => this.setState({ jsonBody: event.target.value })}
                            />
                            <InputGroup.Append>
                                <Button id='copyBtn' variant='outline-secondary'>
                                    <Image
                                        src={copyImage}
                                        alt='copy icon'
                                        onClick={event => this._copyText(this.state.jsonBody, event)}
                                        fluid
                                    />
                                </Button>
                            </InputGroup.Append>
                        </InputGroup>
                    </Modal.Footer>
                </Modal>
                {this.state.isLoading && <SpinnerComponent />}
            </div>
        );
    }
}
