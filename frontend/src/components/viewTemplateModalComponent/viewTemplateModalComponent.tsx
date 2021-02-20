import React from 'react';
import './viewTemplateModalComponent.css';
import { ToastComponentProperties, ToastFunctionProperties, ToastInterfaces, ToastType } from '../../models/toastInterfaces';
import { Button, Modal, Tabs, Tab, InputGroup, FormControl } from 'react-bootstrap/';

interface ModalComponentProperties extends ToastComponentProperties {
    isViewOpen: boolean;
}

export class ViewTemplateModalComponent extends React.Component<any, ModalComponentProperties> {
    private _addToast: (t: ToastInterfaces) => void;
    private _toastMessages: Array<ToastInterfaces> = [];

    constructor(props: ToastFunctionProperties) {
        super(props);
        this._addToast = props.addToast;
        this.state = {
            isViewOpen: false,
            properties: this._toastMessages,
        };
    }
    private _handleModalClose() {
        this.setState({ isViewOpen: false });
    }
    private _handleModalOpen() {
        this.setState({ isViewOpen: true });
    }

    render(): JSX.Element {
        const toast = { id: 'testSuccess', body: 'This is to test success works', type: ToastType.SUCCESS, open: true };
        return (
            <div>
                <Button
                    variant='primary'
                    onClick={() => {
                        this._handleModalOpen();
                    }}
                >
                    View Template
                </Button>
                <Modal
                    show={this.state.isViewOpen}
                    scrollable
                    onClick={() => {
                        this._handleModalClose();
                    }}
                >
                    <Modal.Header closeButton>
                        <Modal.Title>Template name</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Tabs defaultActiveKey='single'>
                            <Tab eventKey='single' title='Single'>
                                <label>Recipient</label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Recipient' />
                                </InputGroup>
                                <label>Parameter 1</label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 1' />
                                </InputGroup>
                                <label>Parameter 2</label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 2' />
                                </InputGroup>
                                <label>Parameter 3</label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 3' />
                                </InputGroup>
                                <label>Parameter 4</label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 4' />
                                </InputGroup>
                                <label>Parameter 5</label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 5' />
                                </InputGroup>
                            </Tab>
                            <Tab eventKey='batch' title='Batch'>
                                <label>Recipient</label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Recipient' />
                                </InputGroup>
                                <label>Parameter 1</label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 1' />
                                </InputGroup>
                                <label>Parameter 2</label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 2' />
                                </InputGroup>
                                <label>Parameter 3</label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 3' />
                                </InputGroup>
                                <label>Parameter 4</label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 4' />
                                </InputGroup>
                                <label>Parameter 5</label>
                                <InputGroup className='mb-3'>
                                    <FormControl placeholder='Parameter 5' />
                                </InputGroup>
                            </Tab>
                        </Tabs>
                    </Modal.Body>
                    <Modal.Footer>
                        <label>URL</label>
                        <InputGroup className='mb-3'>
                            <FormControl placeholder='URL' />
                            <InputGroup.Append>
                                <Button variant='outline-secondary'>Button</Button>
                            </InputGroup.Append>
                        </InputGroup>
                        <label>API Key</label>
                        <InputGroup className='mb-3'>
                            <FormControl placeholder='API Key' />
                            <InputGroup.Append>
                                <Button variant='outline-secondary'>Button</Button>
                            </InputGroup.Append>
                        </InputGroup>
                        <label>Body</label>
                        <InputGroup>
                            <FormControl as='textarea' aria-label='With textarea' />
                            <InputGroup.Append>
                                <Button variant='outline-secondary'>Button</Button>
                            </InputGroup.Append>
                        </InputGroup>
                    </Modal.Footer>
                </Modal>
                <button onClick={() => this._addToast(toast)}>Trigger Success</button>
            </div>
        );
    }
}
