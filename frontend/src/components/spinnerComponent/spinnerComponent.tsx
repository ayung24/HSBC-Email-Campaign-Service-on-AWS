import { Spinner } from 'react-bootstrap';
import React from 'react';

export class SpinnerComponent extends React.Component {
    render(): JSX.Element {
        return (
            <div className='parentDisable'>
                <div className='overlay-box'>
                    <Spinner animation='border' role='status' />
                </div>
            </div>
        );
    }
}
