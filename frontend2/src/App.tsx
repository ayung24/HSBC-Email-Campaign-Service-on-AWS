import React from 'react';
import './App.css';
import Amplify from 'aws-amplify';
import awsconfig from './aws-exports';
import LogInPage from "./components/LogInPage";
Amplify.configure(awsconfig);

function App() {
  return (
      <div className="App-container">
        <LogInPage />
      </div>
  );
}

export default App;
