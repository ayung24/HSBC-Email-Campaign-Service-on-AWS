export interface IError {
    code: string;
    message: string;
}

export interface IErrorReturnResponse {
    request: any;
    response: IErrorResponse;
}

export interface IErrorResponse {
    data: IError;
}

export class ESCError implements IError {
    constructor(public code: string, public message: string) {}
}
