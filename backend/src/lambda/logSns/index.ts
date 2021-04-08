import { ErrorCode, ErrorMessages, ESCError } from '../../ESCError';
import * as Logger from '../../logger';
import * as AWS from 'aws-sdk';
import { SNSEvent } from 'aws-lambda';

const CLOUDWATCH_REGION = process.env.REGION;
const EMAIL_EVENTS_LOG_GROUP_NAME = process.env.EMAIL_EVENTS_LOG_GROUP_NAME;
const CLOUDWATCH_VERSION = process.env.CLOUDWATCH_VERSION || '2014-03-28';

const validateEnv = function (): boolean {
    return !!CLOUDWATCH_REGION && !!EMAIL_EVENTS_LOG_GROUP_NAME;
};

const cloudWatch = new AWS.CloudWatchLogs({ apiVersion: CLOUDWATCH_VERSION });

const getNextSequenceToken = async function (logStreamName: string): Promise<string> {
    return new Promise((resolve, reject) => {
        cloudWatch.describeLogStreams(
            {
                logGroupName: EMAIL_EVENTS_LOG_GROUP_NAME!,
                logStreamNamePrefix: logStreamName,
            },
            (err: AWS.AWSError, data: AWS.CloudWatchLogs.DescribeLogStreamsResponse) => {
                if (err) {
                    Logger.logError(err);
                    const getTokenError = new ESCError(ErrorCode.ES21, 'Get sequence token error');
                    reject(getTokenError);
                } else if ((data.logStreams?.length ?? 0) < 1) {
                    resolve('');
                } else {
                    resolve(data.logStreams![0].uploadSequenceToken ?? '');
                }
            },
        );
    });
};

export const handler = async function (event: SNSEvent) {
    if (!validateEnv()) {
        return Promise.reject({
            statusCode: 500,
            body: JSON.stringify({
                message: ErrorMessages.INTERNAL_SERVER_ERROR,
                code: ErrorCode.ES19,
            }),
        });
    }
    if (!event.Records || event.Records.length === 0) {
        return Promise.reject({
            statusCode: 500,
            body: JSON.stringify({
                message: ErrorMessages.INTERNAL_SERVER_ERROR,
                code: ErrorCode.ES20,
            }),
        });
    }
    Logger.info({ message: 'RECEIVED EVENT', additionalInfo: event });
    const message = event.Records[0].Sns?.Message;
    const messageJson = message ? JSON.parse(message) : {};
    Logger.info({ message: 'Message', additionalInfo: messageJson });
    const templateId: string = messageJson.mail?.tags?.template_id ? messageJson.mail.tags.template_id[0] : 'NoTemplateId';
    const timestamp = event.Records[0].Sns?.Timestamp ? new Date(event.Records[0].Sns?.Timestamp).getMilliseconds() : Date.now();
    const logEvent = {
        message: message,
        timestamp: timestamp,
    };
    return getNextSequenceToken(templateId).then(sequenceToken => {
        return new Promise<AWS.CloudWatchLogs.PutLogEventsRequest>((resolve, reject) => {
            if (sequenceToken === '') {
                cloudWatch.createLogStream(
                    {
                        logGroupName: EMAIL_EVENTS_LOG_GROUP_NAME!,
                        logStreamName: templateId,
                    },
                    (err: AWS.AWSError) => {
                        if (err) {
                            Logger.logError(err);
                            const createLogStreamError = new ESCError(ErrorCode.ES23, 'Create log stream error');
                            reject(createLogStreamError);
                        } else {
                            resolve({
                                logGroupName: EMAIL_EVENTS_LOG_GROUP_NAME!,
                                logStreamName: templateId,
                                logEvents: [logEvent],
                            });
                        }
                    },
                );
            } else {
                resolve({
                    logGroupName: EMAIL_EVENTS_LOG_GROUP_NAME!,
                    logStreamName: templateId,
                    logEvents: [logEvent],
                    sequenceToken: sequenceToken,
                });
            }
        }).then(params => {
            return new Promise((resolve, reject) => {
                cloudWatch.putLogEvents(params, (err: AWS.AWSError, data: AWS.CloudWatchLogs.PutLogEventsResponse) => {
                    if (err) {
                        Logger.logError(err);
                        const logEventError = new ESCError(ErrorCode.ES22, 'Log event error');
                        reject(logEventError);
                    } else {
                        resolve(data);
                    }
                });
            });
        });
    });
};
