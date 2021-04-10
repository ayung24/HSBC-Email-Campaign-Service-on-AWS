import React from 'react';
import Table from 'react-bootstrap/Table';
import './templateGridComponent.css';
import { ViewTemplateModalComponent } from '../viewTemplateModalComponent/viewTemplateModalComponent';
import { TemplateService } from '../../services/templateService';
import { createErrorMessage, ToastFunctionProperties, ToastInterface, ToastType } from '../../models/toastInterfaces';
import { ITemplateDisplay } from '../../models/templateInterfaces';
import { SpinnerState } from '../spinnerComponent/spinnerComponent';
import { EventEmitter } from '../../services/eventEmitter';
import { isIErrorReturnResponse } from '../../models/iError';
import { isEmpty } from '../../commonFunctions';
import { Spinner } from 'react-bootstrap/';

interface TemplateGridState extends SpinnerState {
    templatesRaw: ITemplateDisplay[];
    pendingTemplates: ITemplateDisplay[];
    templates: Array<JSX.Element>;
}

export class TemplateGridComponent extends React.Component<ToastFunctionProperties, TemplateGridState> {
    private _templateService: TemplateService;
    private _addToast: (t: ToastInterface) => void;

    constructor(props: ToastFunctionProperties) {
        super(props);
        this._templateService = new TemplateService();
        this._addToast = props.addToast;

        this.state = {
            templatesRaw: [],
            pendingTemplates: [],
            templates: [],
            isLoading: true,
        };
    }

    public addPendingTemplate(template: ITemplateDisplay): void {
        const newPendingTemplates = this.state.pendingTemplates;
        newPendingTemplates.push(template);
        this.setState({ pendingTemplates: newPendingTemplates });
    }

    public removePendingTemplate(t: ITemplateDisplay): Promise<void> {
        const newPendingTemplates = this.state.pendingTemplates;
        const index = newPendingTemplates.findIndex(template => template.templateId === t.templateId);
        newPendingTemplates.splice(index, 1);
        return new Promise(resolve => this.setState({ pendingTemplates: newPendingTemplates }, () => resolve()));
    }

    public transformTemplates(templatesResponse: ITemplateDisplay[]): void {
        this.setState({ templatesRaw: templatesResponse });
        const allTemplates = templatesResponse.concat(this.state.pendingTemplates);
        const templates = allTemplates.map((template: ITemplateDisplay) => {
            const { templateId, templateName, uploadTime } = template;

            const dateStr = uploadTime
                ? // Plus one because month is returned from 0-11
                  String(uploadTime.getMonth() + 1).padStart(2, '0') +
                  '-' +
                  String(uploadTime.getDate()).padStart(2, '0') +
                  '-' +
                  uploadTime.getFullYear() +
                  ' ' +
                  String(uploadTime.getHours()).padStart(2, '0') +
                  ':' +
                  String(uploadTime.getMinutes()).padStart(2, '0')
                : 'Uploading template...';

            return (
                <tr key={templateId + ' , ' + (uploadTime?.getTime() ?? Number.MAX_SAFE_INTEGER)}>
                    <td className={'name'}>{templateName}</td>
                    <td className={'upload-time'}>{dateStr}</td>
                    <td className={'view-details'}>
                        <ViewTemplateModalComponent
                            addToast={this._addToast.bind(this)}
                            templateId={templateId}
                            templateName={templateName}
                            timeCreated={uploadTime ? dateStr : undefined}
                        />
                    </td>
                </tr>
            );
        });

        templates.sort((a: any, b: any) => {
            const date1 = a.key.split(',')[1];
            const date2 = b.key.split(',')[1];
            return date2 - date1;
        });

        this.setState({ templates: templates });
    }

    public getTemplates(): ITemplateDisplay[] {
        return this.state.templatesRaw.slice();
    }

    renderTemplates(searchString: string): void {
        let templatePromise: Promise<ITemplateDisplay[]>;
        if (isEmpty(searchString)) {
            templatePromise = this._templateService.getTemplates();
        } else {
            templatePromise = this._templateService.getFilteredTemplates(searchString);
        }
        this.setState({ isLoading: true }, () =>
            templatePromise
                .then(response => {
                    this.setState({ templatesRaw: response });
                    this.transformTemplates(response);
                })
                .catch(err => {
                    let body: string;
                    if (isIErrorReturnResponse(err)) {
                        body = createErrorMessage(err.response.data, 'Could not load template list.');
                    } else {
                        body = 'Could not load template list.';
                    }
                    const toast = {
                        id: 'getTemplatesError',
                        body: body,
                        type: ToastType.ERROR,
                        open: true,
                    };
                    this._addToast(toast);
                })
                .finally(() => this.setState({ isLoading: false })),
        );
    }

    componentDidMount(): void {
        EventEmitter.getInstance().subscribe('refreshGrid', () => this.renderTemplates(''));
        this.renderTemplates('');
    }

    private _renderHeader(): JSX.Element {
        return (
            <tr>
                <th className={'name'}>Name</th>
                <th className={'upload-time'}>Upload Time</th>
                <th className={'view-details'} />
            </tr>
        );
    }

    private _renderTable(): JSX.Element | JSX.Element[] {
        return this.state.isLoading ? (
            <Spinner animation='border' role='status' />
        ) : this.state.templates.length ? (
            this.state.templates
        ) : (
            <tr>
                <td>No templates found</td>
            </tr>
        );
    }

    render(): JSX.Element {
        return (
            <div className={'templates'}>
                <Table hover>
                    <thead>{this._renderHeader()}</thead>
                    <tbody>{this._renderTable()}</tbody>
                </Table>
            </div>
        );
    }
}
