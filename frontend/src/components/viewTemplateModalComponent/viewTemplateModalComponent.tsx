import React from 'react';
import './viewTemplateModalComponent.css';
import copyImage from '../../images/copyText.png';
import copiedImage from '../../images/copiedText.png';
import arrowIcon from '../../images/arrow.png';
import toolsIcon from '../../images/tools.png';
import { ToastFunctionProperties, ToastInterface } from '../../models/toastInterfaces';
import { Image, Button, Modal, Tabs, Tab, InputGroup, FormControl, Form } from 'react-bootstrap/';
import { awsEndpoints } from '../../awsEndpoints';
import { ITemplate } from '../../models/templateInterfaces';
import { TemplateService } from '../../services/templateService';

interface ViewModalState {
    isViewOpen: boolean;
    url: string;
    apiKey: string;
    jsonBody: {
        templateId: string;
        recipient: string;
        fields: any;
    };
}

interface ViewTemplateModalProperties extends ToastFunctionProperties {
    templateName: string;
    timeCreated: string;
    templateId: string;
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
        this.state = {
            isViewOpen: false,
            url: this._getUrl(),
            apiKey: '',
            jsonBody: {
                templateId: props.templateId,
                recipient: '',
                fields: {},
            },
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
    }

    private _copyText(text: string, event: any): void {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        event.target.src = copiedImage;
        document.body.removeChild(textArea);
    }

    render(): JSX.Element {
        return (
            <div>
                <Button id='tools' variant='outline-dark' onClick={() => this._handleModalOpen()}>
                    <Image src={toolsIcon} alt='tools icon' />
                </Button>
                <Modal show={this.state.isViewOpen} scrollable onHide={() => this._handleModalClose()}>
                    <Modal.Header>
                        <div className='headerDiv'>
                            <Button id='arrow' variant='outline-dark' onClick={() => this._handleModalClose()}>
                                <Image src={arrowIcon} alt='arrow icon' fluid />
                            </Button>
                            <Button variant='outline-dark' className='float-right' style={{ marginTop: '12px' }}>
                                Delete
                            </Button>
                            <Modal.Title>{this.props.templateName}</Modal.Title>
                            <span>Created at {this.props.timeCreated}</span>
                        </div>
                    </Modal.Header>
                    <Modal.Body id='body'>
                        <Tabs defaultActiveKey='single'>
                            <Tab id='single' eventKey='single' title='Single'>
                                <Form.Label>Recipient</Form.Label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Recipient' />
                                </InputGroup>
                                <Form.Label>Parameter 1</Form.Label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 1' />
                                </InputGroup>
                                <Form.Label>Parameter 2</Form.Label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 2' />
                                </InputGroup>
                                <Form.Label>Parameter 3</Form.Label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 3' />
                                </InputGroup>
                                <Form.Label>Parameter 4</Form.Label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 4' />
                                </InputGroup>
                                <Form.Label>Parameter 5</Form.Label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 5' />
                                </InputGroup>
                            </Tab>
                            <Tab id='batch' eventKey='batch' title='Batch'>
                                <Form.Label>Recipient</Form.Label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Recipient' />
                                </InputGroup>
                                <Form.Label>Parameter 1</Form.Label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 1' />
                                </InputGroup>
                                <Form.Label>Parameter 2</Form.Label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 2' />
                                </InputGroup>
                                <Form.Label>Parameter 3</Form.Label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 3' />
                                </InputGroup>
                                <Form.Label>Parameter 4</Form.Label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 4' />
                                </InputGroup>
                                <Form.Label>Parameter 5</Form.Label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 5' />
                                </InputGroup>
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
            </div>
        );
    }
}
