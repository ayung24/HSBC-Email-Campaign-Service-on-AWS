import React from 'react';
import './App.css';
import { awsAuthConfiguration } from './awsAuthConfiguration';
import { AuthState, onAuthUIStateChange } from '@aws-amplify/ui-components';
import { TemplateComponent } from './components/templateComponent/templateComponent';
import { AuthenticationComponent } from './components/loginComponent/authenticationComponent';
import { HeaderComponent } from './components/headerComponent/headerComponent';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Amplify, Auth } from 'aws-amplify';
import { Button } from 'react-bootstrap';

Amplify.configure(awsAuthConfiguration);

function App(): JSX.Element {
    const [authState, setAuthState] = React.useState<AuthState>();

    React.useEffect(() => {
        return onAuthUIStateChange((nextAuthState, authData) => {
            setAuthState(nextAuthState);
        });
    }, []);

    const component = authState === AuthState.SignedIn ? <TemplateComponent /> : <AuthenticationComponent />;

    return (
        <div className='app-container'>
            <div className='header-container'>
                <HeaderComponent />
                {authState === AuthState.SignedIn && (
                    <div className='signout'>
                        <Button onClick={() => Auth.signOut()} className='logout-button'>
                            Log out
                        </Button>
                    </div>
                )}
            </div>
            {component}
        </div>
    );
}

export default App;
