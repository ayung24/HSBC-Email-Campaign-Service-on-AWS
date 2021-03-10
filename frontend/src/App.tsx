import React from 'react';
import './App.css';
import { awsAuthConfiguration } from './awsAuthConfiguration';
import { AuthState, CognitoUserInterface, onAuthUIStateChange } from '@aws-amplify/ui-components';
import { TemplateComponent } from './components/templateComponent/templateComponent';
import { AuthenticationComponent } from './components/loginComponent/authenticationComponent';
import { HeaderComponent } from './components/headerComponent/headerComponent';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Amplify, Auth } from 'aws-amplify';
import { Button } from 'react-bootstrap';
import { LoginLogger, LogoutLogger } from './services/logger';

Amplify.configure(awsAuthConfiguration);

interface AppState {
    authState: AuthState;
    user: CognitoUserInterface | undefined;
}

export class App extends React.Component<any, AppState> {
    constructor(props = {}) {
        super(props);
        this.state = { authState: AuthState.Loading, user: undefined };
    }

    componentDidMount(): void {
        onAuthUIStateChange((nextAuthState, authData) => {
            const user = authData as CognitoUserInterface;
            if (nextAuthState === AuthState.SignedIn && this.state.authState === AuthState.SignIn) {
                LoginLogger.info({
                    message: 'User login SUCCESS',
                    additionalInfo: {
                        username: user.username,
                        userPoolId: user.pool?.userPoolId,
                        attributes: user?.attributes,
                    },
                });
            }
            this.setState({ authState: nextAuthState, user: user });
        });
    }

    private _isLoggedIn(): boolean {
        return this.state.authState === AuthState.SignedIn;
    }

    private _signOut(): void {
        LogoutLogger.info({
            message: 'User logged out',
            additionalInfo: {
                username: this.state.user?.username,
                userPoolId: this.state.user?.pool?.userPoolId,
                attributes: this.state.user?.attributes,
            },
        });
        Auth.signOut();
    }

    render(): JSX.Element {
        return (
            <div className='app-container'>
                <div className='header-container'>
                    <HeaderComponent />
                    {this._isLoggedIn() && (
                        <div className='signout'>
                            <Button onClick={() => this._signOut()} className='logout-button'>
                                Log out
                            </Button>
                        </div>
                    )}
                </div>
                {this._isLoggedIn() && <TemplateComponent />}
                {!this._isLoggedIn() && <AuthenticationComponent />}
            </div>
        );
    }
}
