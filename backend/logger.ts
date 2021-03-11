import { APIGatewayProxyEvent } from 'aws-lambda';

interface ILogItem {
    message: string;
    additionalInfo?: any;
}

type ErrorType = { message: string };

function createLogString(logItem: ILogItem): string {
    let logString: string = logItem.message;
    if (logItem.additionalInfo) {
        logString = logString + `\nAdditional Info: ${JSON.stringify(logItem.additionalInfo)}`;
    }
    return logString;
}

export function info(logItem: ILogItem): void {
    console.info(createLogString(logItem));
}

export function warn(logItem: ILogItem): void {
    console.warn(createLogString(logItem));
}

export function err(logItem: ILogItem): void {
    console.error(createLogString(logItem));
}

export function debug(logItem: ILogItem): void {
    console.debug(createLogString(logItem));
}

export function logRequestInfo(event: APIGatewayProxyEvent): void {
    info({
        message: 'Request made',
        additionalInfo: {
            user: `${event.requestContext.authorizer?.claims['cognito:username']}-${event.requestContext.authorizer?.claims['sub']}`,
            path: event.path,
            httpMethod: event.httpMethod,
        },
    });
}

export function logCURLInfo(event: APIGatewayProxyEvent): void {
    info({
        message: 'Request made',
        additionalInfo: {
            user: `${event.requestContext.identity.userAgent}`,
            path: event.path,
            httpMethod: event.httpMethod,
        },
    });
}

export function logError(error: ErrorType, message: string | undefined = undefined): void {
    err({ message: !message ? error.message : message, additionalInfo: error });
}
