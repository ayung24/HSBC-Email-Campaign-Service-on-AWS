import React from 'react';
import Table from 'react-bootstrap/Table';
import './templateGridComponent.css';
import { ViewTemplateModalComponent } from '../viewTemplateModalComponent/viewTemplateModalComponent';
import { TemplateService } from '../../services/templateService';
import { createErrorMessage, ToastFunctionProperties, ToastInterface, ToastType } from '../../models/toastInterfaces';
import { ITemplateDisplay } from '../../models/templateInterfaces';
import { SpinnerComponent, SpinnerState } from '../spinnerComponent/spinnerComponent';
import { EventEmitter } from '../../services/eventEmitter';
import { isIErrorReturnResponse } from '../../models/iError';
import { isEmpty } from '../../commonFunctions';

interface TemplateGridState extends SpinnerState {
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
            templates: [],
            isLoading: true,
        };
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
                    const templates = response.map((template: ITemplateDisplay) => {
                        const { templateId, templateName, uploadTime } = template;

                        const dateStr =
                            // Plus one because month is returned from 0-11
                            String(uploadTime.getMonth() + 1).padStart(2, '0') +
                            '-' +
                            String(uploadTime.getDate()).padStart(2, '0') +
                            '-' +
                            uploadTime.getFullYear() +
                            ' ' +
                            String(uploadTime.getHours()).padStart(2, '0') +
                            ':' +
                            String(uploadTime.getMinutes()).padStart(2, '0');

                        return (
                            <tr key={templateId + ' , ' + uploadTime.getTime()}>
                                <td className={'name'}>{templateName}</td>
                                <td className={'upload-time'}>{dateStr}</td>
                                <td className={'view-details'}>
                                    <ViewTemplateModalComponent
                                        addToast={this._addToast.bind(this)}
                                        templateId={templateId}
                                        templateName={templateName}
                                        timeCreated={dateStr}
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

    renderHeader(): JSX.Element {
        return (
            <tr>
                <th className={'name'}>Name</th>
                <th className={'upload-time'}>Upload Time</th>
                <th className={'view-details'} />
            </tr>
        );
    }

    render(): JSX.Element {
        return (
            <div className={'templates'}>
                <Table hover>
                    <thead>{this.renderHeader()}</thead>
                    <tbody>
                        {!this.state.templates.length ? (
                            <tr>
                                <td>No templates found</td>
                            </tr>
                        ) : (
                            this.state.templates
                        )}
                    </tbody>
                </Table>
                {this.state.isLoading && <SpinnerComponent />}
            </div>
        );
    }
}
