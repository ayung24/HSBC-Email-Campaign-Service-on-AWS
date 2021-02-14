import React from 'react'
import './authenticationComponent.css'
import {AmplifyAuthenticator, AmplifySignIn} from '@aws-amplify/ui-react';

export class AuthenticationComponent extends React.Component {
    render() {
        return (
            <div className="authentication-container">
                <AmplifyAuthenticator>
                    <AmplifySignIn slot="sign-in" headerText="Please sign in to your HSBC account" hideSignUp/>
                </AmplifyAuthenticator>
            </div>
        );
    }
}
