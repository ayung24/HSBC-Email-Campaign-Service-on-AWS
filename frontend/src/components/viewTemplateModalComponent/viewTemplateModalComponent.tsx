import React from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import './viewTemplateModalComponent.css';
import copyImage from '../../images/copyText.png';
import copiedImage from '../../images/copiedText.png';
import arrowIcon from '../../images/arrow.png';
import toolsIcon from '../../images/tools.png';
import { KMS, AWSError } from 'aws-sdk';
import { awsEndpoints } from '../../awsEndpoints';
import { ToastFunctionProperties, ToastInterface, ToastType } from '../../models/toastInterfaces';
import { Image, Button, Modal, Tabs, Tab, InputGroup, FormControl, Form } from 'react-bootstrap/';
import { awsAuthConfiguration } from '../../awsAuthConfiguration';
import { TemplateService } from '../../services/templateService';
import { SpinnerComponent, SpinnerState } from '../spinnerComponent/spinnerComponent';
import { EventEmitter } from '../../services/eventEmitter';
import { nonEmpty } from '../../commonFunctions';
import { ITemplate } from '../../models/templateInterfaces';

interface ISendEmailReqBody {
    templateId: string;
    subject: string;
    recipient: string;
    fields: SendEmailFields;
}

type SendEmailFields = {
    [key: string]: string;
};

interface ViewModalState extends SpinnerState {
    isViewOpen: boolean;
    url: string;
    apiKey: string;
    jsonBody: ISendEmailReqBody;
    fieldNames: string[];
}

interface ViewTemplateModalProperties extends ToastFunctionProperties {
    templateId: string;
    templateName: string;
    timeCreated: string;
}

export class ViewTemplateModalComponent extends React.Component<ViewTemplateModalProperties, ViewModalState> {
    private _addToast: (t: ToastInterface) => void;
    private _templateService: TemplateService;
    private _keyManagementService: KMS;

    private readonly _inputFormNameRecipient: string;
    private readonly _inputFormNameSubject: string;

    constructor(props: ViewTemplateModalProperties) {
        super(props);
        this._addToast = props.addToast;
        this._templateService = new TemplateService();
        this.state = {
            isViewOpen: false,
            url: this._getUrl(),
            apiKey: '',
            jsonBody: {
                templateId: props.templateId,
                subject: '',
                recipient: '',
                fields: {},
            },
            fieldNames: [],
            isLoading: false,
        };

        this._inputFormNameRecipient = 'form-control-recipient';
        this._inputFormNameSubject = 'form-control-subject';

        this._keyManagementService = new KMS({
            region: awsAuthConfiguration.Auth.region,
        });
    }

    private _handleModalClose(): void {
        this.setState({ isViewOpen: false });
    }

    private _handleModalOpen(): void {
        this._getTemplateMetadata().then(() => this.setState({ isViewOpen: true }));
    }

    private _getUrl(): string {
        const productionEndpoint = awsEndpoints.find(endpoint => endpoint.name === 'prod');
        if (productionEndpoint) {
            return `${productionEndpoint.endpoint}/email`;
        } else {
            const toast = {
                id: 'deleteTemplatesError',
                body: `url config not set`,
                type: ToastType.ERROR,
                open: true,
            };
            this._addToast(toast);
            return 'url config not set';
        }
    }

    private _getTemplateMetadata(): Promise<void> {
        const templateId = this.props.templateId;
        const templateName = this.props.templateName;
        return new Promise<void>((resolve, reject) => {
            this.setState({ isLoading: true }, () => {
                this._templateService
                    .getTemplateMetaData(templateId)
                    .then(response => {
                        const apiKeyBuffer = Buffer.from(response.fieldNames);
                        const decryptParam = {
                            CiphertextBlob: apiKeyBuffer,
                        };
                        return new Promise<ITemplate>((resolve, reject) => {
                            this._keyManagementService.decrypt(decryptParam, (err: AWSError, data: KMS.Types.DecryptResponse) => {
                                if (err) {
                                    reject(err);
                                } else if (!data.Plaintext) {
                                    reject();
                                } else {
                                    response.apiKey = data.Plaintext.toString('ascii');
                                    resolve(response);
                                }
                            });
                        });
                    })
                    .then((response: ITemplate) => {
                        this.setState({
                            fieldNames: response.fieldNames,
                            apiKey: response.apiKey,
                        });
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

    private _copyJson(event: any): any {
        // https://regexr.com/3e48o
        const REGEX = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
        if (!this._isCompleteJson(this.state.jsonBody)) {
            const TOAST_INCOMPLETE = {
                id: 'copyJsonFailed',
                body: 'Incomplete paramaters for JSON\nPlease fill in all fields',
                type: ToastType.ERROR,
                open: true,
            };
            this._addToast(TOAST_INCOMPLETE);
        } else if (!REGEX.test(this.state.jsonBody.recipient)) {
            const TOAST_INVALID_EMAIL = {
                id: 'copyJsonFailed',
                body: `"${this.state.jsonBody.recipient}" is not a valid email`,
                type: ToastType.ERROR,
                open: true,
            };
            this._addToast(TOAST_INVALID_EMAIL);
        } else {
            this._copyText(JSON.stringify(this.state.jsonBody), event);
        }
    }

    private _isCompleteJson(jsonBody: ISendEmailReqBody): boolean {
        return (
            nonEmpty(jsonBody.templateId) &&
            nonEmpty(jsonBody.recipient) &&
            nonEmpty(jsonBody.subject) &&
            // all fields are present
            Object.values(jsonBody.fields).length == this.state.fieldNames.length &&
            // and all fields are filled
            Object.values(jsonBody.fields).reduce((restIsFilled: boolean, field: string): boolean => {
                return restIsFilled && nonEmpty(field);
            }, true)
        );
    }

    private _renderFieldNames(): any {
        const fieldNames = this.state.fieldNames;
        return fieldNames.map((fieldName, index) => (
            <div key={fieldName + index}>
                <Form.Label key={fieldName + index}>{fieldName}</Form.Label>
                <InputGroup className='mb-3'>
                    <FormControl key={fieldName + index} id={fieldName} onChange={this._onParamChange.bind(this)} />
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

    private _onParamChange(event: React.SyntheticEvent): void {
        this.setState((state: ViewModalState) => {
            const formControl: HTMLInputElement = event.target as HTMLInputElement;
            switch (formControl.id) {
                case this._inputFormNameRecipient:
                    state.jsonBody.recipient = formControl.value.trim();
                    break;
                case this._inputFormNameSubject:
                    state.jsonBody.subject = formControl.value.trim();
                    break;
                default:
                    // formControl is for a dynamic field
                    state.jsonBody.fields[formControl.id] = formControl.value.trim();
                    break;
            }

            const newJsonBody = state.jsonBody;
            return {
                jsonBody: newJsonBody,
            };
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
                                        <FormControl id={this._inputFormNameRecipient} onChange={this._onParamChange.bind(this)} />
                                    </InputGroup>
                                    <Form.Label>Subject</Form.Label>
                                    <InputGroup id='subject' className='mb-3'>
                                        <FormControl id={this._inputFormNameSubject} onChange={this._onParamChange.bind(this)} />
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
                        {/* <div className='updateBtnDiv'>
                            <Form.Label>Body</Form.Label>
                            <Button id='updateBtn' variant='outline-secondary'>
                                Update Preview
                            </Button>
                        </div> */}
                        <InputGroup className='mb-5' style={{ flex: 1 }}>
                            <TextareaAutosize
                                disabled
                                value={JSON.stringify(this.state.jsonBody, null, '\t')}
                                style={{
                                    resize: 'none',
                                    flex: 1,
                                }}
                            />
                            <InputGroup.Append>
                                <Button id='copyBtn' variant='outline-secondary' onClick={event => this._copyJson(event)}>
                                    <Image src={copyImage} alt='copy icon' fluid />
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
