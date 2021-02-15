import React from 'react';
import './templateComponent.css';
import { AmplifySignOut } from '@aws-amplify/ui-react';
import { TemplateService } from '../../services/templateService';

export class TemplateComponent extends React.Component {
    private _service: TemplateService;

    constructor(props = {}) {
        super(props);
        this._service = new TemplateService();
    }

    // TODO: Uncomment when ready (i.e. we have a prod environment set up for the backend APIs)
    // componentDidMount(): void {
    //     this._service.getTemplates();
    // }

    render(): JSX.Element {
        return (
            <div className='template-component'>
                <div className='signout'>
                    <AmplifySignOut />
                </div>
                <div className='upload-container'>
                    <h4 className='upload-desc'>Please choose a template file to upload. Accepted file format: .docx</h4>
                    <input type='file' />
                </div>
            </div>
        );
    }
}
