import React from 'react';
import { cleanup } from '@testing-library/react';
import App from '../App';
import ReactDOM from 'react-dom';

afterEach(cleanup);

// Just a mock test, literally tests nothing
it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);
});
