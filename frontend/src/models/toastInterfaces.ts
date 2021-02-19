export interface ToastInterfaces {
    id: string;
    body: string;
    type: ToastType;
    open: boolean;
}

export interface ToastComponentProperties {
    properties: Array<ToastInterfaces>;
}

export interface ToastComponentState {
    states: Array<ToastState>;
}

export interface ToastState {
    id: string;
    open: boolean;
}

export enum ToastType {
    SUCCESS = 'Success',
    ERROR = 'Error',
    NOTIFICATION = 'Notification',
}

export interface ToastFunctionProperties {
    addToast: (t: ToastInterfaces) => void;
}
