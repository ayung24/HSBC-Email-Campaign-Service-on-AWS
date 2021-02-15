import React from 'react';
import './headerComponent.css';
import hsbcLogo from '../../images/hsbc_logo.png';
import awsLogo from '../../images/aws_logo.png';

export class HeaderComponent extends React.Component {
    render(): JSX.Element {
        return (
            <div className='header'>
                <div className='header-logo'>
                    <img src={hsbcLogo} alt='HSBC' height='25px' />
                </div>
                <div className='header-desc'>
                    <div className='header-desc-title'>
                        <h3>Email Campaign Service on </h3>
                    </div>
                    <div className='header-desc-aws'>
                        <img src={awsLogo} alt='AWS' height='18px' />
                    </div>
                </div>
            </div>
        );
    }
}
