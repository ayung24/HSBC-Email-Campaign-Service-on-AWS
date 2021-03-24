import React from 'react';
import Toast from 'react-bootstrap/Toast';
import { ToastComponentProperties, ToastComponentState, ToastInterface, ToastState, ToastType } from '../../models/toastInterfaces';
import './toastComponent.css';

interface ToastComponentPropsWithCloseFunction extends ToastComponentProperties {
    removeToast: (id: string) => void;
}

export class ToastComponent extends React.Component<ToastComponentPropsWithCloseFunction, ToastComponentState> {
    private _toastProperties: Array<ToastInterface> = [];
    private _removeToast: (id: string) => void;

    constructor(props: ToastComponentPropsWithCloseFunction) {
        super(props);
        this.state = { states: [] };
        this._removeToast = props.removeToast;
        this.updateToasts(props.properties);
    }

    public updateToasts(toasts: Array<ToastInterface>): void {
        this._toastProperties = toasts;
        const states = this._toastProperties.map(prop => ({ id: prop.id, open: prop.open }));
        this.setState({ states: states });
    }

    private _closeToast(id: string): void {
        this.setState(
            state => {
                const toastIndex = this._toastProperties.findIndex(toast => toast.id === id);
                if (toastIndex > -1) {
                    this._toastProperties.splice(toastIndex, 1);
                }
                const currStates: Array<ToastState> = [];
                state.states.forEach(s => currStates.push(s));
                const toastStateIndex = currStates.findIndex(state => state.id === id);
                if (toastStateIndex > -1) {
                    currStates.splice(toastStateIndex, 1);
                }
                return { states: currStates };
            },
            () => {
                this._removeToast(id);
            },
        );
    }

    private _isOpen(id: string): boolean {
        const toastIndex = this.state.states.findIndex(state => state.id === id);
        return toastIndex > -1 ? this.state.states[toastIndex].open : false;
    }

    render(): JSX.Element {
        return (
            <div className='toast-component'>
                {this._toastProperties.map(prop => (
                    <Toast
                        key={prop.id}
                        className={prop.type}
                        onClose={() => this._closeToast(prop.id)}
                        show={this._isOpen(prop.id)}
                        animation={true}
                        delay={prop.type !== ToastType.ERROR ? 4000 : 6000}
                        autohide
                    >
                        <Toast.Header className={prop.type}>
                            <strong className='header-text'>{prop.type.toString()}</strong>
                        </Toast.Header>
                        <Toast.Body className={prop.type}>{prop.body}</Toast.Body>
                    </Toast>
                ))}
            </div>
        );
    }
}
