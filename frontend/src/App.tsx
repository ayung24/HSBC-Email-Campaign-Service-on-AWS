import React from 'react';
import './App.css';
import Amplify from 'aws-amplify';
import awsconfig from './aws-exports';
import { AuthState, onAuthUIStateChange } from '@aws-amplify/ui-components';
import { TemplateComponent } from './components/templateComponent/templateComponent';
import { AuthenticationComponent } from './components/loginComponent/authenticationComponent';
import { HeaderComponent } from './components/headerComponent/headerComponent';

Amplify.configure(awsconfig);

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
            <HeaderComponent />
            {component}
        </div>
    );
}

export default App;
