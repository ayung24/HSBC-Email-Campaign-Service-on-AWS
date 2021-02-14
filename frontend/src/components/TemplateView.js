import React from 'react'
import './styling/TemplateView.css'
import { AmplifySignOut, AmplifyAuthenticator } from '@aws-amplify/ui-react';
import Header2 from './Header2';

function TemplateView() {
    return (
        <div className="templateView-container">
            <div className="template-signout">
                <AmplifySignOut/>
            </div>

            <div className = "upload-container">
                <h4 className="upload-desc">Please choose a template file to upload. Accepted file format: .docx</h4>
                <input type="file"/>
            </div>
        </div>
        
    )
}

export default TemplateView;