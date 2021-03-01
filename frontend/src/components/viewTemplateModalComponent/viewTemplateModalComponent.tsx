import React from 'react';
import './viewTemplateModalComponent.css';
import copyImage from '../../images/copyText.png';
import copiedImage from '../../images/copiedText.png';
import arrowIcon from '../../images/arrow.png';
import toolsIcon from '../../images/tools.png';
import { ToastComponentProperties, ToastFunctionProperties, ToastInterface, ToastType } from '../../models/toastInterfaces';
import { OverlayTrigger, Tooltip, Image, Button, Modal, Tabs, Tab, InputGroup, FormControl, Form } from 'react-bootstrap/';

interface ModalComponentProperties extends ToastComponentProperties {
    isViewOpen: boolean;
    url: string;
    apiKey: string;
    jsonBody: string;
}

export class ViewTemplateModalComponent extends React.Component<any, ModalComponentProperties> {
    private _addToast: (t: ToastInterface) => void;
    private _toastMessages: Array<ToastInterface> = [];

    constructor(props: ToastFunctionProperties) {
        super(props);
        this._addToast = props.addToast;
        this.state = {
            isViewOpen: false,
            properties: this._toastMessages,
            url: '',
            apiKey: '',
            jsonBody: '',
        };
    }
    private _handleModalClose(): void {
        this.setState({ isViewOpen: false });
    }
    private _handleModalOpen(): void {
        this.setState({ isViewOpen: true });
    }

    // private getTemplateParameters() {
    //
    // }

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
                <Button
                    id='tools'
                    variant='outline-dark'
                    onClick={() => {
                        this._handleModalOpen();
                    }}
                >
                    <Image src={toolsIcon} alt='tools icon' />
                </Button>
                <Modal
                    show={this.state.isViewOpen}
                    scrollable
                    onHide={() => {
                        this._handleModalClose();
                    }}
                >
                    <Modal.Header>
                        <div className='headerDiv'>
                            <Button
                                id='arrow'
                                variant='outline-dark'
                                onClick={() => {
                                    this._handleModalClose();
                                }}
                            >
                                <Image src={arrowIcon} alt='arrow icon' fluid />
                            </Button>
                            <Button variant='outline-dark' className='float-right' style={{ marginTop: '10px' }}>
                                Delete
                            </Button>
                            <Modal.Title>{this.props.name}</Modal.Title>
                            <span>Created at {this.props.time}</span>
                        </div>
                    </Modal.Header>
                    <Modal.Body>
                        <Tabs defaultActiveKey='single'>
                            <Tab eventKey='single' title='Single'>
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
                            <Tab eventKey='batch' title='Batch'>
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
                    <Modal.Footer>
                        <Form.Label>URL</Form.Label>
                        <InputGroup className='mb-3'>
                            <FormControl
                                disabled
                                placeholder='URL'
                                value={this.state.url}
                                onChange={event => this.setState({ url: event.target.value })}
                            />
                            <InputGroup.Append>
                                <OverlayTrigger
                                    trigger='click'
                                    rootClose
                                    key='bottom'
                                    placement='bottom'
                                    overlay={<Tooltip id={`tooltip-bottom`}>Copied!</Tooltip>}
                                >
                                    <Button id='copyBtn' variant='outline-secondary'>
                                        <Image
                                            src={copyImage}
                                            alt='copy icon'
                                            onClick={event => this._copyText(this.state.url, event)}
                                            fluid
                                        />
                                    </Button>
                                </OverlayTrigger>
                            </InputGroup.Append>
                        </InputGroup>
                        <Form.Label>API Key</Form.Label>
                        <InputGroup className='mb-3'>
                            <FormControl
                                disabled
                                placeholder='API Key'
                                value={this.state.apiKey}
                                onChange={event => this.setState({ apiKey: event.target.value })}
                            />
                            <InputGroup.Append>
                                <OverlayTrigger
                                    trigger='click'
                                    rootClose
                                    key='bottom'
                                    placement='bottom'
                                    overlay={<Tooltip id={`tooltip-bottom`}>Copied!</Tooltip>}
                                >
                                    <Button id='copyBtn' variant='outline-secondary'>
                                        <Image
                                            src={copyImage}
                                            alt='copy icon'
                                            onClick={event => this._copyText(this.state.apiKey, event)}
                                            fluid
                                        />
                                    </Button>
                                </OverlayTrigger>
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
                                value={this.state.jsonBody}
                                style={{ minHeight: '45px' }}
                                onChange={event => this.setState({ jsonBody: event.target.value })}
                            />
                            <InputGroup.Append>
                                <OverlayTrigger
                                    trigger='click'
                                    rootClose
                                    key='bottom'
                                    placement='bottom'
                                    overlay={<Tooltip id={`tooltip-bottom`}>Copied!</Tooltip>}
                                >
                                    <Button id='copyBtn' variant='outline-secondary'>
                                        <Image
                                            src={copyImage}
                                            alt='copy icon'
                                            onClick={event => this._copyText(this.state.jsonBody, event)}
                                            fluid
                                        />
                                    </Button>
                                </OverlayTrigger>
                            </InputGroup.Append>
                        </InputGroup>
                    </Modal.Footer>
                </Modal>
            </div>
        );
    }
}
