import * as AWS from 'aws-sdk';
import * as Logger from '../../logger';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { ErrorCode, ErrorMessages, ESCError } from '../../ESCError';

const CLOUDWATCH_REGION = process.env.REGION;
const EMAIL_EVENTS_LOG_GROUP_NAME = process.env.EMAIL_EVENTS_LOG_GROUP_NAME;
const CLOUDWATCH_VERSION = process.env.CLOUDWATCH_VERSION || '2014-03-28';

const headers = {
    'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    'Content-Type': 'application/json',
};

const validateEnv = function (): boolean {
    return !!CLOUDWATCH_REGION && !!EMAIL_EVENTS_LOG_GROUP_NAME;
};

const cloudWatch = new AWS.CloudWatchLogs({ apiVersion: CLOUDWATCH_VERSION });

export const handler = async function (event: APIGatewayProxyEvent) {
    Logger.logRequestInfo(event);
    if (!validateEnv()) {
        return {
            headers: headers,
            statusCode: 500,
            body: JSON.stringify({
                message: ErrorMessages.INTERNAL_SERVER_ERROR,
                code: ErrorCode.TS35,
            }),
        };
    } else if (!event.pathParameters || !event.pathParameters.id) {
        return {
            headers: headers,
            statusCode: 400,
            body: JSON.stringify({
                message: ErrorMessages.INVALID_REQUEST_FORMAT,
                code: ErrorCode.TS36,
            }),
        };
    }

    const templateId: string = event.pathParameters.id;
    return new Promise<number>((resolve, reject) => {
        cloudWatch.describeLogStreams(
            {
                logGroupName: EMAIL_EVENTS_LOG_GROUP_NAME!,
                logStreamNamePrefix: templateId,
            },
            (err: AWS.AWSError, data: AWS.CloudWatchLogs.DescribeLogStreamsResponse) => {
                if (err) {
                    Logger.logError(err);
                    const describeLogStreamError = new ESCError(ErrorCode.TS40, 'Describe log stream error');
                    reject(describeLogStreamError);
                } else {
                    resolve(data.logStreams?.length ?? 0);
                }
            },
        );
    })
        .then((logStreamLength: number) => {
            return new Promise((resolve, reject) => {
                if (logStreamLength < 1) {
                    resolve([]);
                } else {
                    cloudWatch.getLogEvents(
                        {
                            logGroupName: EMAIL_EVENTS_LOG_GROUP_NAME!,
                            logStreamName: templateId,
                        },
                        (err: AWS.AWSError, data: AWS.CloudWatchLogs.GetLogEventsResponse) => {
                            if (err) {
                                Logger.logError(err);
                                const getLogsError = new ESCError(
                                    ErrorCode.TS37,
                                    `Failed to get logs for template with id [${templateId}]`,
                                );
                                reject(getLogsError);
                            } else if (!data.events) {
                                const undefinedEventsError = new ESCError(ErrorCode.TS38, 'Events are undefined');
                                Logger.logError(undefinedEventsError);
                                reject(undefinedEventsError);
                            } else {
                                const messages = data.events.map((event: AWS.CloudWatchLogs.OutputLogEvent) => {
                                    return event.message
                                        ? { timestamp: new Date(event.timestamp!).toISOString(), event: JSON.parse(event.message) }
                                        : { timestamp: new Date(Date.now()).toISOString(), event: 'Undefined event' };
                                });
                                resolve(messages);
                            }
                        },
                    );
                }
            });
        })
        .then(messages => {
            const events = {
                events: messages,
            };
            return {
                headers: headers,
                statusCode: 200,
                body: JSON.stringify(events),
            };
        })
        .catch(err => {
            let statusCode: number;
            let message: string;
            let code: string;
            if (err instanceof ESCError) {
                statusCode = err.getStatusCode();
                message = err.isUserError ? err.message : ErrorMessages.INTERNAL_SERVER_ERROR;
                code = err.code;
            } else {
                statusCode = 500;
                message = ErrorMessages.INTERNAL_SERVER_ERROR;
                code = ErrorCode.TS39;
            }
            return {
                headers: headers,
                statusCode: statusCode,
                body: JSON.stringify({
                    message: message,
                    code: code,
                }),
            };
        });
};
