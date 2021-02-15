import React from 'react';
import './templateComponent.css';
import { AmplifySignOut } from '@aws-amplify/ui-react';

export class TemplateComponent extends React.Component {
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
