/**
 * Error codes
 * Each error code used AT MOST one time
 */
export enum ErrorCode {
    // Template service codes
    TS0 = 'TS0',
    TS1 = 'TS1',
    TS2 = 'TS2',
    TS3 = 'TS3',
    TS4 = 'TS4',
    TS5 = 'TS5',
    TS6 = 'TS6',
    TS7 = 'TS7',
    TS8 = 'TS8',
    TS9 = 'TS9',
    TS10 = 'TS10',
    TS11 = 'TS11',
    TS12 = 'TS12',
    TS13 = 'TS13',
    TS14 = 'TS14',
    TS15 = 'TS15',
    TS16 = 'TS16',
    TS17 = 'TS17',
    TS18 = 'TS18',
    TS19 = 'TS19',
    TS20 = 'TS20',
    TS21 = 'TS21',
    TS22 = 'TS22',
    TS23 = 'TS23',
    TS24 = 'TS24',
    TS25 = 'TS25',
    // TS26 = 'TS26', // Used in frontend
    TS27 = 'TS27',
    TS28 = 'TS28',
    TS29 = 'TS29',
    TS30 = 'TS30',
    TS31 = 'TS31',
    TS32 = 'TS32',

    // Email service codes
    ES0 = 'ES0',
    ES1 = 'ES1',
    ES2 = 'ES2',
    ES3 = 'ES3',
    ES4 = 'ES4',
    ES5 = 'ES5',
    ES6 = 'ES6',
    ES7 = 'ES7',
    ES8 = 'ES8',
    ES9 = 'ES9',
    ES10 = 'ES10',
    ES11 = 'ES11',
}

/**
 * Generic error messages
 */
export class ErrorMessages {
    public static INTERNAL_SERVER_ERROR = 'Internal server error';
    public static INVALID_REQUEST_FORMAT = 'Invalid request format';
}

export class ESCError extends Error {
    constructor(public code: ErrorCode, public message: string, public isUserError: boolean = false) {
        super(message);
    }
    public getStatusCode(): number {
        return this.isUserError ? 400 : 500;
    }
}
