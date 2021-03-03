import { APIGatewayProxyEvent } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const VERIFIED_EMAIL_ADDRESS = process.env.VERIFIED_EMAIL_ADDRESS;
const VERSION = process.env.VERSION || "2010-12-01"

const ses = new AWS.SES({
    apiVersion: VERSION
})

export const handler = async function (event: APIGatewayProxyEvent) {
    // TODO: replace with actual email html from S3
    const params = {
        Destination: {
            ToAddresses: [VERIFIED_EMAIL_ADDRESS]
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: "<div>This is my email</div>"
                },
                Text: {
                    Charset: 'UTF-8',
                    Data: "This is test email"
                },
            },
            Subject: {
                Charset: 'UTF-8',
                Data: 'Test email'
            }
        },
        Source: VERIFIED_EMAIL_ADDRESS
    }
    const sendEmail = ses.sendEmail(params).promise()
    return sendEmail.then((res: AWS.SES.SendEmailResponse) => {
        console.info("Email sent to SES", res);
    }).catch(err => console.warn(err))
}