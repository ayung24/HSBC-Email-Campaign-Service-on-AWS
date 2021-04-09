import { SQSEvent } from 'aws-lambda';
import { nonEmptyArray } from '../../commonFunctions';
import { ErrorCode, ErrorMessages } from '../../ESCError';
import { IEmailQueueBody, ILogEvent } from '../lambdaInterfaces';
import { logTemplateEvent } from './index';
import * as Logger from '../../logger';

const CLOUDWATCH_REGION = process.env.REGION;
const EMAIL_EVENTS_LOG_GROUP_NAME = process.env.EMAIL_EVENTS_LOG_GROUP_NAME;

const validateEnv = function (): boolean {
    return !!CLOUDWATCH_REGION && !!EMAIL_EVENTS_LOG_GROUP_NAME;
};

export const handler = async function (event: SQSEvent) {
    Logger.info({ message: 'Received failed send', additionalInfo: event });
    if (!validateEnv()) {
        return Promise.reject({
            status: 500,
            body: JSON.stringify({
                message: ErrorMessages.INTERNAL_SERVER_ERROR,
                code: ErrorCode.ES24,
            }),
        });
    } else if (nonEmptyArray(event.Records)) {
        const failedEvent = JSON.parse(event.Records[0].body);
        const body: IEmailQueueBody = JSON.parse(failedEvent.body);
        const timestamp = parseInt(event.Records[0].attributes.SentTimestamp);
        const logEvent: ILogEvent = {
            message: JSON.stringify({
                eventType: 'Failure',
                mail: {
                    sender: body.from,
                    reciever: body.to,
                    subject: body.subject,
                    fields: body.fields,
                },
            }),
            timestamp: timestamp,
        };
        return logTemplateEvent(body.templateId, logEvent);
    }
};
