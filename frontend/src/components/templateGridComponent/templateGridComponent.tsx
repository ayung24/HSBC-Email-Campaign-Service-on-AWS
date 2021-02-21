import React from 'react';
import Table from 'react-bootstrap/Table';
import './templateGridComponent.css';
import { TemplateService } from '../../services/templateService';
import { ToastFunctionProperties, ToastInterface, ToastType } from '../../models/toastInterfaces';
import { ITemplateDisplay } from '../../models/templateInterfaces';

export class TemplateGridComponent extends React.Component<ToastFunctionProperties, { templates: JSX.Element[] }> {
    private _templateService: TemplateService;
    private _addToast: (t: ToastInterface) => void;

    constructor(props: ToastFunctionProperties) {
        super(props);
        this._templateService = new TemplateService();
        this._addToast = props.addToast;

        this.state = {
            templates: [],
        };
    }

    renderTemplates(): void {
        this._templateService
            .getTemplates()
            .then(response => {
                const templates = response.map((template: ITemplateDisplay) => {
                    const { id, name, uploadTime } = template;

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
                        <tr key={id}>
                            <td className={'name'}>{name}</td>
                            <td className={'upload-time'}>{dateStr}</td>
                        </tr>
                    );
                });

                this.setState({ templates: templates });
            })
            .catch(() => {
                const toast = {
                    id: 'getTemplatesError',
                    body: 'Could not load template list.',
                    type: ToastType.ERROR,
                    open: true,
                };
                this._addToast(toast);
            });
    }

    componentDidMount(): void {
        this.renderTemplates();
    }

    renderHeader(): JSX.Element {
        return (
            <tr>
                <th className={'name'}>Name</th>
                <th className={'upload-time'}>Upload Time</th>
            </tr>
        );
    }

    render(): JSX.Element {
        return (
            <div className={'templates'}>
                <Table hover>
                    <thead>{this.renderHeader()}</thead>
                    <tbody>{this.state.templates}</tbody>
                </Table>
            </div>
        );
    }
}
