export interface IError {
    code: string;
    message: string;
}

export interface IErrorReturnResponse {
    request: any;
    response: IErrorResponse;
}

export function isIErrorReturnResponse(object: any): object is IErrorReturnResponse {
    return !!object && 'response' in object && isIErrorResponse(object.response);
}

export interface IErrorResponse {
    data: IError;
}

function isIErrorResponse(object: any): object is IErrorResponse {
    return !!object && 'data' in object;
}

export class ESCError implements IError {
    constructor(public code: string, public message: string) {}
}
