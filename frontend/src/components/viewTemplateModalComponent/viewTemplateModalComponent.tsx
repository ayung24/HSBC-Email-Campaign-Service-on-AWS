import React from 'react';
import './viewTemplateModalComponent.css';
import copyImage from '../../images/copyText.png';
import copiedImage from '../../images/copiedText.png';
import arrowIcon from '../../images/arrow.png';
import toolsIcon from '../../images/tools.png';
import { ToastFunctionProperties, ToastInterface, ToastType } from '../../models/toastInterfaces';
import { Image, Button, Modal, Tabs, Tab, InputGroup, FormControl, Form } from 'react-bootstrap/';
import { awsEndpoints } from '../../awsEndpoints';
import { ITemplate } from '../../models/templateInterfaces';
import { TemplateService } from '../../services/templateService';
import { SpinnerComponent, SpinnerState } from '../spinnerComponent/spinnerComponent';
import { EventEmitter } from '../../services/eventEmitter';

interface ViewModalState extends SpinnerState {
    isViewOpen: boolean;
    url: string;
    apiKey: string;
    jsonBody: {
        templateId: string;
        recipient: string;
        fields: any;
    };
    fieldNames: any[];
}

interface ViewTemplateModalProperties extends ToastFunctionProperties {
    templateId: string;
    templateName: string;
    timeCreated: string;
    templateService: TemplateService;
}

export class ViewTemplateModalComponent extends React.Component<ViewTemplateModalProperties, ViewModalState> {
    private _addToast: (t: ToastInterface) => void;
    private _templateService: TemplateService;
    private _onModalOpen: () => void;

    constructor(props: ViewTemplateModalProperties) {
        super(props);
        // console.log(props.templateService);
        this._addToast = props.addToast;
        this._templateService = new TemplateService();
        this.state = {
            isViewOpen: false,
            url: this._getUrl(),
            apiKey: '',
            jsonBody: {
                templateId: props.templateId,
                recipient: '',
                fields: {},
            },
            fieldNames: [],
            isLoading: false,
        };
        this._templateService = props.templateService;
        this._onModalOpen = () => {
            // set myself to do nothing on first run
            this._onModalOpen = () => {
                return;
            };
            // this.setState({ apiKey: 'asdf' });
            this._templateService
                .getTemplateMetaData(props.templateId)
                .then((template: ITemplate) => {
                    this.setState({ apiKey: template.apiKey });
                })
                .catch(err => {
                    this.setState({ apiKey: err });
                });
        };
    }

    private _handleModalClose(): void {
        this.setState({ isViewOpen: false });
    }

    private _handleModalOpen(): void {
        this.setState({ isViewOpen: true });
        this._onModalOpen(); // load details on first open
    }

    private _getUrl(): string {
        const productionEndpoint = awsEndpoints.find(endpoint => endpoint.name === 'prod');
        return productionEndpoint ? `${productionEndpoint.endpoint}/email` : 'url config not set';
        this._getTemplateFieldNames().then(() => this.setState({ isViewOpen: true }));
    }

    private _getTemplateFieldNames(): Promise<void> {
        const templateId = this.props.templateId;
        const templateName = this.props.templateName;
        return new Promise<void>((resolve, reject) => {
            this.setState({ isLoading: true }, () => {
                this._templateService
                    .getTemplateMetaData(templateId)
                    .then(response => {
                        this.setState({ fieldNames: response.fieldNames });
                        resolve();
                    })
                    .catch((err: any) => {
                        this._addToast(this._getTemplateFieldNamesErrorToast(err, templateName));
                        reject(err);
                    })
                    .finally(() => this.setState({ isLoading: false }));
            });
        });
    }

    private _getTemplateFieldNamesErrorToast(err: any, templateName: string): ToastInterface {
        return {
            id: `getTemplateFieldNamesError-${err.response}`,
            body: `An error occured when getting field names for template [${templateName}]. Error: ${err.response}`,
            type: ToastType.ERROR,
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
                            <FormControl disabled value={this.state.url} />
                            <InputGroup.Append>
                                <Button id='copyBtn' variant='outline-secondary'>
                                    <Image src={copyImage} alt='copy icon' onClick={event => this._copyText(this.state.url, event)} fluid />
                                </Button>
                            </InputGroup.Append>
                        </InputGroup>
                        <Form.Label>API Key</Form.Label>
                        <InputGroup className='mb-3'>
                            <FormControl disabled value={this.state.apiKey} />
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
                                style={{
                                    minHeight: '46px',
                                    resize: 'none',
                                }}
                                value={JSON.stringify(this.state.jsonBody, null, 1)}
                            />
                            <InputGroup.Append>
                                <Button id='copyBtn' variant='outline-secondary'>
                                    <Image
                                        src={copyImage}
                                        alt='copy icon'
                                        onClick={event => this._copyText(JSON.stringify(this.state.jsonBody), event)}
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
