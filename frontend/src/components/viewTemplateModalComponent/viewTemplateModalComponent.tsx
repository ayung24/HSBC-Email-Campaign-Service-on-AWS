import React from 'react';
import './viewTemplateModalComponent.css';
import copyImage from '../../images/copyText.png';
import copiedImage from '../../images/copiedText.png';
import arrowIcon from '../../images/arrow.png';
import toolsIcon from '../../images/tools.png';
import { ToastFunctionProperties, ToastInterface, ToastType } from '../../models/toastInterfaces';
import { Image, Button, Modal, Tabs, Tab, InputGroup, FormControl, Form } from 'react-bootstrap/';
import { TemplateService } from '../../services/templateService';

interface ViewModalState {
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
        this.state = {
            isViewOpen: false,
            url: '',
            apiKey: '',
            jsonBody: '',
            fieldNames: [],
        };
        this._templateService = new TemplateService();
    }

    private _handleModalClose(): void {
        this.setState({ isViewOpen: false });
    }

    private _handleModalOpen(): void {
        this.getTemplateParameters();
        this.setState({ isViewOpen: true });
    }

    private getTemplateParameters(): void {
        const id = this.props.templateId;
        const name = this.props.templateName;
        this._templateService
            .getTemplateMetaData(id)
            .then(response => {
                const toast = {
                    id: 'getTemplateMetadataSuccess',
                    body: 'Successfully got template metadata for: ' + name,
                    type: ToastType.SUCCESS,
                    open: true,
                };
                this._addToast(toast);
                this.setState({ fieldNames: response.fieldNames });
            })
            .catch(() => {
                const toast = {
                    id: 'getTemplateMetadataError',
                    body: 'Could not get template metadata for: ' + name,
                    type: ToastType.ERROR,
                    open: true,
                };
                this._addToast(toast);
            });
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

    private _renderParameters(): any {
        const parameters = this.state.fieldNames;
        return parameters.map((parameter, index) => (
            <div key={parameter + index}>
                <Form.Label key={parameter + index}>Parameter {index + 1}</Form.Label>
                <InputGroup className='mb-3'>
                    <FormControl key={parameter + index} placeholder={'Parameter ' + (index + 1)} defaultValue={parameter} />
                </InputGroup>
            </div>
        ));
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
                            <Button variant='outline-dark' className='float-right' style={{ marginTop: '12px' }}>
                                See Logs
                            </Button>
                            <Modal.Title>{this.props.templateName}</Modal.Title>
                            <span>Created at {this.props.timeCreated}</span>
                        </div>
                    </Modal.Header>
                    <Modal.Body id='body'>
                        <Tabs defaultActiveKey='single'>
                            <Tab id='single' eventKey='single' title='Single'>
                                <Form.Label>Recipient</Form.Label>
                                <InputGroup id='recipient' className='mb-3'>
                                    <FormControl placeholder='Recipient' />
                                </InputGroup>
                                {this._renderParameters()}
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
            </div>
        );
    }
}
