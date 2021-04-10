/**
 * Taken from CDK SES Template Mailer
 * https://github.com/mkrn/cdk-ses-template-mailer
 * Could not just install and use the library because their library contained a bug which is manually fixed by us
 * Also included extended functionality by Team Make Bank
 */
import * as AWS from 'aws-sdk';

const SES_VERSION = process.env.SES_VERSION || '2010-12-01';

const ses = new AWS.SES({
    apiVersion: SES_VERSION,
});

const send = (event: any, context: any, responseStatus: any, responseData: any, physicalResourceId?: any) => {
    return new Promise((resolve, reject) => {
        const responseBody = JSON.stringify({
            Status: responseStatus,
            Reason: 'See the details in CloudWatch Log Stream: ' + context.logStreamName,
            PhysicalResourceId: physicalResourceId || context.logStreamName,
            StackId: event.StackId,
            RequestId: event.RequestId,
            LogicalResourceId: event.LogicalResourceId,
            Data: responseData,
        });

        console.log('Response body:\n', responseBody);

        const https = require('https');
        const url = require('url');

        const parsedUrl = url.parse(event.ResponseURL);
        const options = {
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.path,
            method: 'PUT',
            headers: {
                'content-type': '',
                'content-length': responseBody.length,
            },
        };

        const request = https.request(options, function (response: any) {
            console.log('Status code: ' + response.statusCode);
            console.log('Status message: ' + response.statusMessage);
            resolve(context.done());
        });

        request.on('error', function (error: any) {
            console.log('send(..) failed executing https.request(..): ' + error);
            reject(context.done(error));
        });

        request.write(responseBody);
        request.end();
    });
};

exports.handler = async (event: any, context: any) => {
    const { ResourceProperties, RequestType } = event;
    const { ConfigurationSetName, TopicARN, MatchingEventTypes, EventDestinationName } = ResourceProperties;

    console.log(JSON.stringify(event));

    try {
        switch (RequestType) {
            case 'Delete': {
                await ses
                    .deleteConfigurationSetEventDestination({
                        ConfigurationSetName: ConfigurationSetName,
                        EventDestinationName: EventDestinationName,
                    })
                    .promise()
                    .then(() => {
                        return ses
                            .deleteConfigurationSet({
                                ConfigurationSetName: ConfigurationSetName,
                            })
                            .promise();
                    });
                return await send(event, context, 'SUCCESS', {});
            }
            case 'Create': {
                await ses
                    .createConfigurationSet({
                        ConfigurationSet: {
                            Name: ConfigurationSetName,
                        },
                    })
                    .promise()
                    .then(() => {
                        return ses
                            .createConfigurationSetEventDestination({
                                ConfigurationSetName,
                                EventDestination: {
                                    Name: EventDestinationName,
                                    Enabled: true,
                                    MatchingEventTypes: MatchingEventTypes,
                                    SNSDestination: {
                                        TopicARN,
                                    },
                                },
                            })
                            .promise();
                    });
                return await send(event, context, 'SUCCESS', {});
            }
            default:
            case 'Update': {
                // Seems SES Configuration Set has no update function
                await ses
                    .updateConfigurationSetEventDestination({
                        ConfigurationSetName,
                        EventDestination: {
                            Name: EventDestinationName,
                            Enabled: true,
                            MatchingEventTypes: MatchingEventTypes,
                            SNSDestination: {
                                TopicARN,
                            },
                        },
                    })
                    .promise();
                return await send(event, context, 'SUCCESS', {});
            }
        }
    } catch (err) {
        console.error(err);
        return await send(event, context, 'FAILED', {});
    }
};
export {};
