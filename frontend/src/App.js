import './App.css';
import Header2 from './components/Header2';
import TemplateView from './components/TemplateView';
import Amplify from 'aws-amplify';
import awsconfig from './aws-exports';
import { AmplifySignIn, AmplifySignOut, AmplifyAuthenticator } from '@aws-amplify/ui-react';
import LogInPage from './components/LogInPage';
Amplify.configure(awsconfig);

function App() {
  return (
    <div className="App-container">
      <LogInPage />
    </div>
  );
}

export default App;
