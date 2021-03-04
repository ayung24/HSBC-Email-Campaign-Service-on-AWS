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
        this.getTemplateFieldNames();
        this.setState({ isViewOpen: true });
    }

    private getTemplateFieldNames(): void {
        const id = this.props.templateId;
        const name = this.props.templateName;
        this._templateService
            .getTemplateMetaData(id)
            .then(response => {
                this._addToast(this._getTemplateFieldNamesSuccessToast(name));
                this.setState({ fieldNames: response.fieldNames });
            })
            .catch((err: any) => {
                this._addToast(this.__getTemplateFieldNamesErrorToast(err, name));
            });
    }

    private __getTemplateFieldNamesErrorToast(err: any, name: string): ToastInterface {
        return {
            id: `getTemplateFieldNamesError-${err.response}`,
            body: `An error occured when getting field names for template [${name}]. Error: ${err.response}`,
            type: ToastType.ERROR,
            open: true,
        };
    }

    private _getTemplateFieldNamesSuccessToast(name: string): ToastInterface {
        return {
            id: `getTemplateFieldNamesSuccess-${name}`,
            body: `Template [${name}] field names retrieved successfully!`,
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
                                {this._renderFieldNames()}
                            </Tab>
                            <Tab id='batch' eventKey='batch' title='Batch'>
                                <Form.Label>Recipient</Form.Label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Recipient' />
                                </InputGroup>
                                {this._renderFieldNames()}
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
