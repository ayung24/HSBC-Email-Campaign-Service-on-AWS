import { Spinner } from 'react-bootstrap';
import React from 'react';
import './spinnerComponent.css';

export interface SpinnerState {
    isLoading: boolean;
}

export class SpinnerComponent extends React.Component {
    render(): JSX.Element {
        return (
            <div className='spinner-component'>
                <div className='spinner-overlay'>
                    <Spinner animation='border' role='status' />
                </div>
            </div>
        );
    }
}
