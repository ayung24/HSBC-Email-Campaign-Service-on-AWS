import { config } from '../config';
import { Logger } from 'winston';

const winston = require('winston');
const WinstonCloudWatch = require('winston-cloudwatch');

interface ILogItem {
    message: string;
    additionalInfo: any;
}

export abstract class AbstractLogger {
    protected static _logger: Logger;

    private static _createLogString(logItem: ILogItem): string {
        let logString: string = logItem.message;
        if (logItem.additionalInfo) {
            logString = logString + `\nAdditional Info: ${JSON.stringify(logItem.additionalInfo)}`;
        }
        return logString;
    }

    public static info(logItem: ILogItem): void {
        this._logger.info(this._createLogString(logItem));
    }

    public static warn(logItem: ILogItem): void {
        this._logger.warn(this._createLogString(logItem));
    }

    public static error(logItem: ILogItem): void {
        this._logger.error(this._createLogString(logItem));
    }

    public static debug(logItem: ILogItem): void {
        this._logger.debug(this._createLogString(logItem));
    }
}

let region: string;
if (process.env.REACT_APP_BUILD_ENV && process.env.REACT_APP_BUILD_ENV === 'prod') {
    region = config.cloudWatch.REGION_PROD;
} else {
    region = config.cloudWatch.REGION_DEV;
}

export class LoginLogger extends AbstractLogger {
    protected static _logger: Logger = winston.createLogger({
        format: winston.format.json(),
        transports: [
            new WinstonCloudWatch({
                logGroupName: `/amplify/Login-${process.env.REACT_APP_BUILD_ENV}`,
                logStreamName: () => {
                    return new Date().toISOString().split(':')[0];
                },
                awsAccessKeyId: config.cloudWatch.ACCESS_KEY,
                awsSecretKey: config.cloudWatch.SECRET_KEY,
                awsRegion: region,
            }),
        ],
    });
}

export class LogoutLogger extends AbstractLogger {
    protected static _logger: Logger = winston.createLogger({
        format: winston.format.json(),
        transports: [
            new WinstonCloudWatch({
                logGroupName: `/amplify/Logout-${process.env.REACT_APP_BUILD_ENV}`,
                logStreamName: () => {
                    return new Date().toISOString().split(':')[0];
                },
                awsAccessKeyId: config.cloudWatch.ACCESS_KEY,
                awsSecretKey: config.cloudWatch.SECRET_KEY,
                awsRegion: region,
            }),
        ],
    });
}
