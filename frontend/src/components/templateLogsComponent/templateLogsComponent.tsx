import React from 'react';
import './templateLogsComponent.css';
import { TemplateService } from '../../services/templateService';
import { Button } from 'react-bootstrap/';
import { SpinnerComponent, SpinnerState } from '../spinnerComponent/spinnerComponent';
import { IGetTemplateLogsResponseBody } from '../../models/templateInterfaces';
import { createErrorMessage, ToastInterface, ToastType } from '../../models/toastInterfaces';
import { isIErrorReturnResponse } from '../../models/iError';

const renderjson = require('renderjson');

interface TemplateLogsProperties {
    templateId: string;
    templateName: string;
    addToast: (t: ToastInterface) => void;
}

interface TemplateLogsState extends SpinnerState {
    selectedEvents: Set<string>;
    logs: IGetTemplateLogsResponseBody;
}

export class TemplateLogsComponent extends React.Component<TemplateLogsProperties, TemplateLogsState> {
    private _addToast: (t: ToastInterface) => void;
    private _templateService: TemplateService;

    constructor(props: TemplateLogsProperties) {
        super(props);
        this._addToast = props.addToast;
        this._templateService = new TemplateService();
        const allEvents = ['Send', 'Delivery', 'Open', 'Click'];
        this.state = { isLoading: false, selectedEvents: new Set<string>(allEvents), logs: { events: [] } };
    }

    private _refreshLogs(): void {
        this.setState({ isLoading: true }, () => {
            this._templateService
                .getTemplateLogs(this.props.templateId)
                .then(logs => {
                    this.setState({ logs: logs });
                    const filteredEvents = logs.events.filter(log => this.state.selectedEvents.has(log.event.eventType));
                    return {
                        events: filteredEvents,
                    };
                })
                .then(logs => {
                    renderjson.set_show_to_level(3);
                    renderjson.set_collapse_msg((len: number) => '...');
                    this._populateJson(logs);
                })
                .catch(err => {
                    let body: string;
                    if (isIErrorReturnResponse(err)) {
                        body = createErrorMessage(err.response.data, `Could not retrieve logs for template [${this.props.templateName}]`);
                    } else {
                        body = `Could not retrieve logs for template [${this.props.templateName}]`;
                    }
                    const toast = {
                        id: `getLogsError-${this.props.templateId}`,
                        body: body,
                        type: ToastType.ERROR,
                        open: true,
                    };
                    this._addToast(toast);
                })
                .finally(() => this.setState({ isLoading: false }));
        });
    }

    private _populateJson(logs: IGetTemplateLogsResponseBody): void {
        let childElement: any;
        if (logs.events.length > 0) {
            childElement = renderjson(logs);
        } else {
            const noEvents = document.createElement('div');
            noEvents.innerText = 'No events';
            childElement = noEvents;
        }
        const logsElement = document.getElementById('logs');
        if (logsElement && logsElement.childNodes.length > 0) {
            logsElement.replaceChild(childElement, logsElement.childNodes[0]);
        } else if (logsElement) {
            logsElement.appendChild(childElement);
        }
    }

    private _clientRefresh(): void {
        const filteredEvents = this.state.logs.events.filter(log => this.state.selectedEvents.has(log.event.eventType));
        this._populateJson({
            events: filteredEvents,
        });
    }

    private _editSelectedEvents(event: string): void {
        const selectedEvents = this.state.selectedEvents;
        if (selectedEvents.has(event)) {
            selectedEvents.delete(event);
        } else {
            selectedEvents.add(event);
        }
        this.setState({ selectedEvents: selectedEvents }, () => this._clientRefresh());
    }

    componentDidMount(): void {
        this._refreshLogs();
    }

    render(): JSX.Element {
        return (
            <div className='template-logs-component'>
                <span className='filter-text'>Filter by event type:</span>
                <input
                    type='checkbox'
                    id='Send'
                    className='filter-checkbox'
                    onClick={() => this._editSelectedEvents('Send')}
                    checked={this.state.selectedEvents.has('Send')}
                />
                <label className='checkbox-label' onClick={() => this._editSelectedEvents('Send')}>
                    Send
                </label>
                <input
                    type='checkbox'
                    id='Delivery'
                    className='filter-checkbox'
                    onClick={() => this._editSelectedEvents('Delivery')}
                    checked={this.state.selectedEvents.has('Delivery')}
                />
                <label className='checkbox-label' onClick={() => this._editSelectedEvents('Delivery')}>
                    Delivery
                </label>
                <input
                    type='checkbox'
                    id='Open'
                    className='filter-checkbox'
                    onClick={() => this._editSelectedEvents('Open')}
                    checked={this.state.selectedEvents.has('Open')}
                />
                <label className='checkbox-label' onClick={() => this._editSelectedEvents('Open')}>
                    Open
                </label>
                <input
                    type='checkbox'
                    id='Click'
                    className='filter-checkbox'
                    onClick={() => this._editSelectedEvents('Click')}
                    checked={this.state.selectedEvents.has('Click')}
                />
                <label className='checkbox-label' onClick={() => this._editSelectedEvents('Click')}>
                    Trackable Link
                </label>
                <Button
                    size='sm'
                    className='refresh-button'
                    variant='outline-dark'
                    onClick={this._refreshLogs.bind(this)}
                    disabled={this.state.isLoading}
                >
                    Refresh
                </Button>
                {this.state.isLoading && <SpinnerComponent />}
                <div id='logs' />
            </div>
        );
    }
}
