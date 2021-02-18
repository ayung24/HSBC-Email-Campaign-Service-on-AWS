import React from 'react';
import './templateGridComponent.css';
import { TemplateService } from '../../services/templateService';

export class TemplateGridComponent extends React.Component<unknown, { templates: [] }> {
    private _templateService: TemplateService;

    constructor(props = {}) {
        super(props);
        this._templateService = new TemplateService();

        this.state = {
            templates: [],
        };
    }

    renderTemplates(): void {
        this._templateService.getTemplates().then(response => {
            const templates = response.map((template: { TemplateID: string; Name: string; TimeCreated: number }) => {
                const { TemplateID, Name, TimeCreated } = template;

                const date = new Date(TimeCreated);
                const dateStr =
                    String(date.getMonth() + 1).padStart(2, '0') +
                    '-' +
                    String(date.getDate()).padStart(2, '0') +
                    '-' +
                    date.getFullYear() +
                    ' ' +
                    String(date.getHours()).padStart(2, '0') +
                    ':' +
                    String(date.getMinutes()).padStart(2, '0');

                return (
                    <tr key={TemplateID}>
                        <td className={'name'}>{Name}</td>
                        <td className={'upload-time'}>{dateStr}</td>
                    </tr>
                );
            });

            this.setState({ templates: templates });
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
            <div>
                <table className='templates'>
                    <thead>{this.renderHeader()}</thead>
                    <tbody>{this.state.templates}</tbody>
                </table>
            </div>
        );
    }
}
