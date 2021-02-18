import React from 'react';
import './templateGridComponent.css';
import { ToastFunctionProperties, ToastInterfaces, ToastType } from '../../models/toastInterfaces';

export class TemplateGridComponent extends React.Component<ToastFunctionProperties> {
    private _addToast: (t: ToastInterfaces) => void;

    constructor(props: ToastFunctionProperties) {
        super(props);
        this._addToast = props.addToast;
    }

    render(): JSX.Element {
        const toast = {
            id: 'testError',
            body: 'This is to test this works. You may need this if your service could not get the templates for some reason.',
            type: ToastType.ERROR,
            open: true,
        };
        return <button onClick={() => this._addToast(toast)}>Trigger Error</button>;
    }
}
