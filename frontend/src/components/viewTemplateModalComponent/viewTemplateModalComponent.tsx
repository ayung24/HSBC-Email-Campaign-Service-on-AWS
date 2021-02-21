import React from 'react';
import './viewTemplateModalComponent.css';
import { ToastFunctionProperties, ToastInterface, ToastType } from '../../models/toastInterfaces';

export class ViewTemplateModalComponent extends React.Component<ToastFunctionProperties> {
    private _addToast: (t: ToastInterface) => void;

    constructor(props: ToastFunctionProperties) {
        super(props);
        this._addToast = props.addToast;
    }

    render(): JSX.Element {
        const toast = { id: 'testSuccess', body: 'This is to test success works', type: ToastType.SUCCESS, open: true };
        return <button onClick={() => this._addToast(toast)}>Trigger Success</button>;
    }
}
