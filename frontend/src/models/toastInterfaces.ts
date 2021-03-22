import { IError } from './iError';

export interface ToastInterface {
    id: string;
    body: string;
    type: ToastType;
    open: boolean;
}

export interface ToastComponentProperties {
    properties: Array<ToastInterface>;
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
    addToast: (t: ToastInterface) => void;
}

export function createErrorMessage(error: IError, message: string) {
    return `[ESCError.${error.code}] ${message} Error: ${error.message} Refresh the page to see the most up to date list of in service templates.`;
}
