import React from 'react'
import './styling/LogInPage.css'
import { AmplifySignOut, AmplifySignIn, AmplifyAuthenticator } from '@aws-amplify/ui-react';
import Header2 from './Header2';
import TemplateView from './TemplateView';

function LogInPage() {
    return (
        <div className="login-container">
            <div className="login-header">
                <Header2 />
            </div>

            <div className="login-column">
                <AmplifyAuthenticator>
                    <AmplifySignIn slot="sign-in" headerText="Please sign in to your HSBC account" hideSignUp/>
                    <TemplateView />
                </AmplifyAuthenticator>
            </div>
        </div>
        
    )
}

export default LogInPage;
