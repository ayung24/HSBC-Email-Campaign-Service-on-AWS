import React from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import './viewTemplateModalComponent.css';
import copyImage from '../../images/copyText.png';
import copiedImage from '../../images/copiedText.png';
import arrowIcon from '../../images/arrow.png';
import toolsIcon from '../../images/tools.png';
import { config } from '../../config';
import { KMS, AWSError } from 'aws-sdk';
import { awsEndpoints } from '../../awsEndpoints';
import { createErrorMessage, ToastFunctionProperties, ToastInterface, ToastType } from '../../models/toastInterfaces';
import { Image, Button, Modal, Tabs, Tab, InputGroup, FormControl, Form, Spinner } from 'react-bootstrap/';
import { TemplateService } from '../../services/templateService';
import { SpinnerComponent, SpinnerState } from '../spinnerComponent/spinnerComponent';
import { EventEmitter } from '../../services/eventEmitter';
import { nonEmpty } from '../../commonFunctions';
import { ITemplateWithHTML } from '../../models/templateInterfaces';
import { IError, IErrorReturnResponse } from '../../models/iError';
import { UploadCsvComponent } from '../uploadCsvComponent/uploadCsvComponent';
import { EmailService } from '../../services/emailService';
import {
    IEmailParameters,
    ISendParameters,
    ISendEmailResponse,
    IBatchSendParameters,
    IBatchSendResponse,
} from '../../models/emailInterfaces';

interface ISendEmailReqBody {
    subject: string;
    recipient: string;
    fields: SendEmailFields;
}

type SendEmailFields = {
    [key: string]: string;
};

interface ViewModalState extends SpinnerState {
    isViewOpen: boolean;
    isDeletePromptOpen: boolean;
    url: string;
    apiKey: string;
    jsonBody: ISendEmailReqBody;
    fieldNames: string[];
    html: string;
    curlRequest: string;
    isEmailLoading: boolean;
}

interface ViewTemplateModalProperties extends ToastFunctionProperties {
    templateId: string;
    templateName: string;
    timeCreated: string;
    addToast: (t: ToastInterface) => void;
}

export class ViewTemplateModalComponent extends React.Component<ViewTemplateModalProperties, ViewModalState> {
    private _addToast: (t: ToastInterface) => void;
    private _templateService: TemplateService;
    private _emailService: EmailService;
    private _keyManagementService: KMS;
    private readonly _inputFormNameRecipient: string;
    private readonly _inputFormNameSubject: string;

    constructor(props: ViewTemplateModalProperties) {
        super(props);
        this._addToast = props.addToast;
        this._templateService = new TemplateService();
        this._emailService = new EmailService();

        this.state = {
            isViewOpen: false,
            isDeletePromptOpen: false,
            url: this._getTemplateUrl(props.templateId),
            apiKey: '',
            jsonBody: {
                subject: '',
                recipient: '',
                fields: {},
            },
            fieldNames: [],
            isLoading: false,
            html: '',
            curlRequest: '',
            isEmailLoading: false,
        };

        this._inputFormNameRecipient = 'form-control-recipient';
        this._inputFormNameSubject = 'form-control-subject';

        this._keyManagementService = new KMS({
            region: config.kms.REGION,
            accessKeyId: config.kms.ACCESS_KEY,
            secretAccessKey: config.kms.SECRET_KEY,
        });
    }

    private _handleModalClose(): void {
        this.setState({
            isViewOpen: false,
            jsonBody: {
                subject: '',
                recipient: '',
                fields: {},
            },
            curlRequest: '',
        });
    }

    private _handleModalOpen(): void {
        this._getTemplateMetadata().then(() => this.setState({ isViewOpen: true }));
    }

    private _handleDeletePromptClose(): void {
        this.setState({ isDeletePromptOpen: false });
    }

    private _handleDeletePromptOpen(): void {
        this.setState({ isDeletePromptOpen: true });
    }

    private _handlePreview(): void {
        const newWindow = window.open();
        if (newWindow) {
            newWindow.document.title = this.props.templateName;
            newWindow.document.body.innerHTML = this.state.html;
        }
    }

    private _getTemplateUrl(templateId: string): string {
        const productionEndpoint = awsEndpoints.find(endpoint => endpoint.name === 'prod');
        if (productionEndpoint) {
            return `${productionEndpoint.endpoint}/email/?templateid=${templateId}`;
        } else {
            const toast = {
                id: 'getUrlError',
                body: `url config not set`,
                type: ToastType.ERROR,
                open: true,
            };
            this._addToast(toast);
            return 'url config not set';
        }
    }

    private _getCurlRequest(url: string, apiKey: string, jsonBody: string): string {
        return `curl -X POST ${url} -H "APIKey:${apiKey}" -H "Content-Type: application/json" --data-raw '${jsonBody}'`;
    }

    private _getTemplateMetadata(): Promise<void> {
        const templateId = this.props.templateId;
        const templateName = this.props.templateName;
        const kmsRegion = config.kms.REGION;
        const kmsAccountID = config.kms.ACCOUNT_ID;
        const kmsKeyId = config.kms.KEY_ID;

        return new Promise<void>((resolve, reject) => {
            this.setState({ isLoading: true }, () => {
                this._templateService
                    .getTemplateMetaData(templateId)
                    .then(response => {
                        const apiKeyBuffer = Buffer.from(response.apiKey, 'base64');
                        const decryptParam = {
                            KeyId: `arn:aws:kms:${kmsRegion}:${kmsAccountID}:key/${kmsKeyId}`,
                            CiphertextBlob: apiKeyBuffer,
                        };
                        return new Promise<ITemplateWithHTML>((resolve, reject) => {
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
                    .then((response: ITemplateWithHTML) => {
                        this.setState({
                            fieldNames: response.fieldNames,
                            apiKey: response.apiKey,
                            html: response.html,
                            curlRequest: this._getCurlRequest(this.state.url, response.apiKey, JSON.stringify(this.state.jsonBody)),
                        });
                        resolve();
                    })
                    .catch((err: IErrorReturnResponse) => {
                        this._addToast(this._getMetadataErrorToast(err.response.data, templateName));
                        reject(err);
                    })
                    .finally(() => this.setState({ isLoading: false }));
            });
        });
    }

    private _getMetadataErrorToast(error: IError, templateName: string): ToastInterface {
        const body = createErrorMessage(error, `Could not get template details for template [${templateName}].`);
        return {
            id: 'getMetadataError',
            body: body,
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
        document.body.removeChild(textArea);
        if (event.target.className === 'img-fluid') {
            event.target.src = copiedImage;
        } else {
            event.target.firstChild.src = copiedImage;
        }
        const fieldName = event.target.getAttribute('name') ?? event.target.parentNode.getAttribute('name');
        const copiedToast = {
            id: `copyToast-${fieldName}`,
            body: `Copied ${fieldName} to clipboard`,
            type: ToastType.NOTIFICATION,
            open: true,
        };
        this._addToast(copiedToast);
    }

    private _validateEmailRequest(): boolean {
        const isJsonComplete = this._isCompleteJson(this.state.jsonBody);
        if (!isJsonComplete) {
            const TOAST_INCOMPLETE = {
                id: 'copyJsonFailed',
                body: 'Incomplete parameters for JSON. Please fill in all fields',
                type: ToastType.ERROR,
                open: true,
            };
            this._addToast(TOAST_INCOMPLETE);
        }
        const isEmailValid = EmailService.isEmailValid(this.state.jsonBody.recipient);
        if (!isEmailValid) {
            const TOAST_INVALID_EMAIL = {
                id: 'copyJsonFailed',
                body: `[${this.state.jsonBody.recipient}] is not a valid email.`,
                type: ToastType.ERROR,
                open: true,
            };
            this._addToast(TOAST_INVALID_EMAIL);
        }
        return isJsonComplete && isEmailValid;
    }

    private _copyJson(event: any): any {
        if (this._validateEmailRequest()) {
            this._copyText(JSON.stringify(this.state.jsonBody), event);
        }
    }

    private _copyCurl(event: any): any {
        if (this._validateEmailRequest()) {
            this._copyText(this.state.curlRequest, event);
        }
    }

    private _isCompleteJson(jsonBody: ISendEmailReqBody): boolean {
        return (
            nonEmpty(jsonBody.recipient) &&
            nonEmpty(jsonBody.subject) &&
            // all fields are present
            Object.values(jsonBody.fields).length === this.state.fieldNames.length &&
            // and all fields are filled
            Object.values(jsonBody.fields).reduce((restIsFilled: boolean, field: string): boolean => {
                return restIsFilled && nonEmpty(field);
            }, true)
        );
    }

    private _renderFieldNames(tab: string): any {
        const fieldNames = this.state.fieldNames;
        return fieldNames.map((fieldName, index) => (
            <div key={fieldName + index}>
                <Form.Label key={fieldName + index}>{fieldName}</Form.Label>
                <InputGroup className='mb-3'>
                    <FormControl
                        key={fieldName + index}
                        placeholder={'Field ' + (index + 1)}
                        id={`${tab}-${fieldName}`}
                        onChange={this._onParamChange.bind(this)}
                        style={{ overflow: 'ellipsis' }}
                    />
                </InputGroup>
            </div>
        ));
    }

    private _deleteTemplate(): void {
        const templateName = this.props.templateName;
        this.setState({ isDeletePromptOpen: false, isLoading: true }, () => {
            this._templateService
                .deleteTemplate(this.props.templateId)
                .then(response => {
                    EventEmitter.getInstance().dispatch('refreshGrid');
                    const toast = {
                        id: 'deleteTemplatesSuccess',
                        body: `Successfully deleted template: [${templateName}].`,
                        type: ToastType.SUCCESS,
                        open: true,
                    };
                    this._addToast(toast);
                    this._handleModalClose();
                })
                .catch((err: IErrorReturnResponse) => {
                    const body = createErrorMessage(err.response.data, `Could not delete template [${templateName}].`);
                    const toast = {
                        id: 'deleteTemplatesError',
                        body: body,
                        type: ToastType.ERROR,
                        open: true,
                    };
                    this._addToast(toast);
                })
                .finally(() => this.setState({ isLoading: false }));
        });
    }

    private _sendEmail(): void {
        this.setState({ isEmailLoading: true }, () => {
            if (this._validateEmailRequest()) {
                const emailParams: ISendParameters = {
                    templateId: this.props.templateId,
                    apiKey: this.state.apiKey,
                    subject: this.state.jsonBody.subject,
                    recipient: this.state.jsonBody.recipient,
                    fields: this.state.jsonBody.fields,
                };
                this._emailService
                    .sendEmail(emailParams)
                    .then((response: ISendEmailResponse) => {
                        const toast = {
                            id: 'sendEmailSuccess',
                            body: `Successfully processed email to [${response.recipient}] and sent to queue.`,
                            type: ToastType.SUCCESS,
                            open: true,
                        };
                        this._addToast(toast);
                    })
                    .catch((err: IErrorReturnResponse) => {
                        const body = createErrorMessage(err.response.data, `Could not send email to [${this.state.jsonBody.recipient}].`);
                        const toast = {
                            id: 'sendEmailError',
                            body: body,
                            type: ToastType.ERROR,
                            open: true,
                        };
                        this._addToast(toast);
                    })
                    .finally(() => this.setState({ isEmailLoading: false }));
            } else {
                this.setState({ isEmailLoading: false });
            }
        });
    }

    private _batchSend(emailParams: IEmailParameters[]): void {
        this.setState({ isEmailLoading: true }, () => {
            const batchEmailParams: IBatchSendParameters = {
                templateId: this.props.templateId,
                apiKey: this.state.apiKey,
                emails: emailParams,
            };
            this._emailService
                .sendBatchEmail(batchEmailParams)
                .then((response: IBatchSendResponse) => {
                    let toast: ToastInterface;
                    if (response.failed === 0) {
                        toast = {
                            id: 'sendBatchEmailSuccess',
                            body: `Successfully processed ${response.processed} emails`,
                            type: ToastType.SUCCESS,
                            open: true,
                        };
                    } else {
                        toast = {
                            id: 'sendBatchEmailError',
                            body: `Failed to process ${response.failed}/${emailParams.length} emails`,
                            type: ToastType.ERROR,
                            open: true,
                        };
                    }
                    this._addToast(toast);
                })
                .catch((err: IErrorReturnResponse) => {
                    const body = createErrorMessage(err.response.data, `Failed to process batch emails.`);
                    const toast = {
                        id: 'sendBatchEmailError',
                        body: body,
                        type: ToastType.ERROR,
                        open: true,
                    };
                    this._addToast(toast);
                })
                .finally(() => this.setState({ isEmailLoading: false }));
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
                    // formControl is from a dynamic field
                    state.jsonBody.fields[formControl.id.substring(formControl.id.indexOf('-') + 1)] = formControl.value.trim();
                    break;
            }

            const newJsonBody = state.jsonBody;
            return {
                jsonBody: newJsonBody,
                curlRequest: this._getCurlRequest(this.state.url, this.state.apiKey, JSON.stringify(newJsonBody)),
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
                            <Button className='delete float-right' onClick={this._handleDeletePromptOpen.bind(this)}>
                                Delete
                            </Button>
                            <Button className='float-right' onClick={this._handlePreview.bind(this)}>
                                Preview
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
                                        <FormControl
                                            id={this._inputFormNameRecipient}
                                            placeholder='Recipient'
                                            onChange={this._onParamChange.bind(this)}
                                        />
                                    </InputGroup>
                                    <Form.Label>Subject</Form.Label>
                                    <InputGroup id='subject' className='mb-3'>
                                        <FormControl
                                            id={this._inputFormNameSubject}
                                            placeholder='Subject'
                                            onChange={this._onParamChange.bind(this)}
                                        />
                                    </InputGroup>
                                </div>
                                <div className='dynamicParameters'>{this._renderFieldNames('single')}</div>
                                <Tabs defaultActiveKey='ui'>
                                    <Tab id='ui' eventKey='ui' title='UI'>
                                        <Button
                                            size='lg'
                                            variant='outline-dark'
                                            className='send-button'
                                            onClick={this._sendEmail.bind(this)}
                                            style={{ marginTop: '12px' }}
                                            disabled={this.state.isEmailLoading}
                                        >
                                            {!this.state.isEmailLoading && <span>Send Email</span>}
                                            {this.state.isEmailLoading && (
                                                <Spinner as='span' animation='border' role='status' aria-hidden='true' />
                                            )}
                                        </Button>
                                    </Tab>
                                    <Tab id='cli' eventKey='cli' title='CLI'>
                                        <div className='cli-div'>
                                            <Form.Label>URL</Form.Label>
                                            <InputGroup className='mb-3'>
                                                <FormControl disabled placeholder='URL' value={this.state.url} />
                                                <InputGroup.Append>
                                                    <Button
                                                        name='URL'
                                                        id='copyBtn'
                                                        variant='outline-secondary'
                                                        onClick={event => this._copyText(this.state.url, event)}
                                                    >
                                                        <Image src={copyImage} alt='copy icon' fluid />
                                                    </Button>
                                                </InputGroup.Append>
                                            </InputGroup>
                                            <Form.Label>API Key</Form.Label>
                                            <InputGroup className='mb-3'>
                                                <FormControl disabled placeholder='API Key' value={this.state.apiKey} />
                                                <InputGroup.Append>
                                                    <Button
                                                        name='API Key'
                                                        id='copyBtn'
                                                        variant='outline-secondary'
                                                        onClick={event => this._copyText(this.state.apiKey, event)}
                                                    >
                                                        <Image src={copyImage} alt='copy icon' fluid />
                                                    </Button>
                                                </InputGroup.Append>
                                            </InputGroup>
                                            <Form.Label>JSON Body</Form.Label>
                                            <InputGroup className='mb-3'>
                                                <TextareaAutosize
                                                    readOnly
                                                    className='jsonBody'
                                                    value={JSON.stringify(this.state.jsonBody, null, '\t')}
                                                />
                                                <InputGroup.Append>
                                                    <Button
                                                        name='JSON Body'
                                                        id='copyBtn'
                                                        variant='outline-secondary'
                                                        onClick={event => this._copyJson(event)}
                                                    >
                                                        <Image src={copyImage} alt='copy icon' fluid />
                                                    </Button>
                                                </InputGroup.Append>
                                            </InputGroup>
                                            <Form.Label>Full cURL Request</Form.Label>
                                            <InputGroup className='mb-3'>
                                                <TextareaAutosize readOnly className='curl' value={this.state.curlRequest} />
                                                <InputGroup.Append>
                                                    <Button
                                                        name='Full cURL Request'
                                                        id='copyBtn'
                                                        variant='outline-secondary'
                                                        onClick={event => this._copyCurl(event)}
                                                    >
                                                        <Image src={copyImage} alt='copy icon' fluid />
                                                    </Button>
                                                </InputGroup.Append>
                                            </InputGroup>
                                        </div>
                                    </Tab>
                                </Tabs>
                            </Tab>
                            <Tab id='batch' eventKey='batch' title='Batch'>
                                <div className='uploadCsv'>
                                    <UploadCsvComponent
                                        fileType={'.csv,.xlsx'}
                                        addToast={this._addToast.bind(this)}
                                        requiredFieldNames={this.state.fieldNames}
                                        onSend={this._batchSend.bind(this)}
                                        service={this._emailService}
                                    />
                                </div>
                            </Tab>
                        </Tabs>
                    </Modal.Body>
                </Modal>
                <Modal show={this.state.isDeletePromptOpen} onHide={() => this._handleDeletePromptClose()}>
                    <Modal.Body>Are you sure you want to delete this template?</Modal.Body>
                    <Modal.Footer>
                        <Button variant='danger' onClick={this._deleteTemplate.bind(this)}>
                            Delete
                        </Button>
                        <Button variant='secondary' onClick={this._handleDeletePromptClose.bind(this)}>
                            Cancel
                        </Button>
                    </Modal.Footer>
                </Modal>
                {this.state.isLoading && <SpinnerComponent />}
            </div>
        );
    }
}
