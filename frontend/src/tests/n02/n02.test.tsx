import { cleanup } from '@testing-library/react';
import { KMS, AWSError } from 'aws-sdk';
import { Amplify } from 'aws-amplify';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from '../../config';
import { awsEndpoints } from '../../awsEndpoints';
import { awsAuthConfiguration } from '../../awsAuthConfiguration';
import { credentials } from './Credentials'; // Credentials is not comitted to git, please make your own
import { RequestServiceForTest } from '../../services/requestService';
import { TemplateService } from '../../services/templateService';
import { ITemplate } from '../../models/templateInterfaces';
const ChildProcess = require('child_process');

const TEST_FILE = './5F2Pics.docx';
// const TEST_FILE = './2F.docx'; // smaller file
const TEST_FILE_FIELDS = ['FA', 'FB', 'FC', 'FD', 'FE'];
const ENDPOINT = awsEndpoints.find(endpoint => endpoint.name === 'prod');
const RECIPIENT = 'makebank.testmain@gmail.com';
const TIMEOUT = 35000;

class TemplateServiceForTest extends TemplateService {
    constructor(token: string) {
        super();
        this._requestService = new RequestServiceForTest(token);
    }
}

const KeyManagementService = new KMS({
    region: config.kms.REGION,
    accessKeyId: config.kms.ACCESS_KEY,
    secretAccessKey: config.kms.SECRET_KEY,
});

Amplify.configure(awsAuthConfiguration);
afterEach(cleanup);

const tokens: string[] = [];
it(
    'login',
    () => {
        const isDone = () => {
            return tokens.length === credentials.length;
        };
        for (const credential of credentials) {
            let cmd = `aws cognito-idp admin-initiate-auth`;
            cmd += ` --auth-flow ADMIN_USER_PASSWORD_AUTH`;
            cmd += ` --client-id ${config.cognito.WEB_CLIENT_ID}`;
            cmd += ` --user-pool-id ${config.cognito.USER_POOL_ID}`;
            cmd += ` --auth-parameters USERNAME=${credential.username},PASSWORD=${credential.password}`;
            const cognitoAuthCmd = ChildProcess.exec(cmd);
            const data = new Promise(resolve => {
                cognitoAuthCmd.stdout.on('data', function (data: any) {
                    const authData = JSON.parse(data);
                    const token = authData.AuthenticationResult.IdToken;
                    expect(token).not.toBe('');
                    tokens.push(token);
                    if (isDone()) {
                        resolve(0);
                    }
                });
            });
            const exit = new Promise((resolve, reject) => {
                cognitoAuthCmd.on('exit', function (code: any) {
                    try {
                        expect(code).toBe(0);
                        resolve(0);
                    } catch (err) {
                        reject(err);
                    }
                });
            });
            return Promise.all([data, exit]);
        }
    },
    TIMEOUT,
);

const templateIds: string[] = [];
const apiKeys: string[] = [];
it(
    'upload unique',
    () => {
        expect(tokens.length).not.toBe(0); // Login has passed
        const file = readFileSync(resolve(__dirname, TEST_FILE));
        const uploads = [];
        for (const i in credentials) {
            const templateServiceForTest = new TemplateServiceForTest(tokens[i]);
            const name = `uniqueName${i}-${Date.now()}`;
            uploads.push(
                templateServiceForTest.uploadTemplate(name, file, TEST_FILE_FIELDS).then(response => {
                    const apiKeyBuffer = Buffer.from(response.apiKey, 'base64');
                    const decryptParam = {
                        KeyId: `arn:aws:kms:${kmsRegion}:${kmsAccountID}:key/${kmsKeyId}`,
                        CiphertextBlob: apiKeyBuffer,
                    };
                    return new Promise<ITemplate>((resolve, reject) => {
                        KeyManagementService.decrypt(decryptParam, (err: AWSError, data: KMS.Types.DecryptResponse) => {
                            if (err) {
                                reject(err);
                            } else if (!data.Plaintext) {
                                reject();
                            } else {
                                response.apiKey = data.Plaintext.toString('ascii');
                                resolve(response);
                            }
                        });
                    });
                }),
            );
        }
        const kmsRegion = config.kms.REGION;
        const kmsAccountID = config.kms.ACCOUNT_ID;
        const kmsKeyId = config.kms.KEY_ID;
        return Promise.all(uploads).then(templates => {
            for (const template of templates) {
                expect(template).not.toBeNull();
                expect(template.templateId).toBeDefined();
                expect(template.templateId).not.toBeNull();
                expect(template.templateId).not.toBe('');
                templateIds.push(template.templateId);
                apiKeys.push(template.apiKey);
            }
        });
    },
    TIMEOUT,
);
// upload non unique is below

it(
    'list',
    () => {
        expect(tokens.length).not.toBe(0); // Login has passed
        expect(templateIds.length).not.toBe(0);
        const lists = [];
        for (const i in credentials) {
            const templateServiceForTest = new TemplateServiceForTest(tokens[i]);
            lists.push(templateServiceForTest.getTemplates());
        }
        return Promise.all(lists).then(arrays => {
            for (const arr of arrays) {
                expect(arr.length).not.toBe(0);
            }
        });
    },
    TIMEOUT,
);

it(
    'view unique',
    () => {
        expect(tokens.length).not.toBe(0); // Login has passed
        expect(templateIds.length).not.toBe(0);
        const views = [];
        for (const i in credentials) {
            const templateServiceForTest = new TemplateServiceForTest(tokens[i]);
            views.push(templateServiceForTest.getTemplateMetaData(templateIds[i]));
        }
        return Promise.all(views).then(templates => {
            let i = 0;
            for (const template of templates) {
                expect(template).not.toBeNull();
                expect(template.templateId).toBe(templateIds[i]);
                i++;
            }
        });
    },
    TIMEOUT,
);

it(
    'view non unique',
    () => {
        expect(tokens.length).not.toBe(0); // Login has passed
        expect(templateIds.length).not.toBe(0);
        expect(apiKeys.length).not.toBe(0);
        const first = 0;
        const views = [];
        for (const i in credentials) {
            const templateServiceForTest = new TemplateServiceForTest(tokens[i]);
            views.push(templateServiceForTest.getTemplateMetaData(templateIds[first]));
        }
        return Promise.all(views).then(templates => {
            for (const template of templates) {
                expect(template).not.toBeNull();
                expect(template.templateId).toBe(templateIds[first]);
            }
        });
    },
    TIMEOUT,
);

const makeSendEmailBody = (subject: string) => {
    const fieldsObject: any = {};
    for (const f of TEST_FILE_FIELDS) {
        fieldsObject[f] = `val for ${f}`;
    }
    const body = {
        subject: subject,
        recipient: RECIPIENT,
        fields: fieldsObject,
    };
    let escapedBody = '';
    for (const char of JSON.stringify(body)) {
        if (char === '"') {
            escapedBody += '\\"';
        } else {
            escapedBody += char;
        }
    }
    return escapedBody;
};

it(
    'send unique',
    () => {
        expect(tokens.length).not.toBe(0); // Login has passed
        expect(templateIds.length).not.toBe(0);
        expect(apiKeys.length).not.toBe(0);
        const sends = [];
        for (const i in credentials) {
            let cmd = `curl -X POST`;
            cmd += ` ${ENDPOINT?.endpoint}/email/?templateid=${templateIds[i]}`;
            cmd += ` -H "APIKey:${apiKeys[i]}"`;
            cmd += ` -H "Content-Type: application/json"`;
            cmd += ` --data-raw "${makeSendEmailBody('N02 automated test - unique')}"`;
            const sendEmailRequest = ChildProcess.exec(cmd);
            sends.push(
                new Promise(resolve => {
                    sendEmailRequest.stdout.on('data', function (data: any) {
                        const sendResult = JSON.parse(data);
                        expect(sendResult.templateId).toBe(templateIds[i]);
                        resolve(0);
                    });
                    sendEmailRequest.on('exit', function (code: any) {
                        expect(code).toBe(0);
                        resolve(0);
                    });
                }),
            );
        }
        return Promise.all(sends);
    },
    TIMEOUT,
);

it(
    'send non unique',
    () => {
        expect(tokens.length).not.toBe(0); // Login has passed
        expect(templateIds.length).not.toBe(0);
        expect(apiKeys.length).not.toBe(0);
        const sends = [];
        const first = 0;
        for (let i = 0; i < credentials.length; i++) {
            let cmd = `curl -X POST`;
            cmd += ` ${ENDPOINT?.endpoint}/email/?templateid=${templateIds[first]}`;
            cmd += ` -H "APIKey:${apiKeys[first]}"`;
            cmd += ` -H "Content-Type: application/json"`;
            cmd += ` --data-raw "${makeSendEmailBody('N02 automated test - not unique')}"`;
            const sendEmailRequest = ChildProcess.exec(cmd);
            sends.push(
                new Promise(resolve => {
                    sendEmailRequest.stdout.on('data', function (data: any) {
                        const sendResult = JSON.parse(data);
                        expect(sendResult.templateId).toBe(templateIds[first]);
                        resolve(0);
                    });
                    sendEmailRequest.on('exit', function (code: any) {
                        expect(code).toBe(0);
                        resolve(0);
                    });
                }),
            );
        }
        Promise.all(sends);
    },
    TIMEOUT,
);

it(
    'delete unique',
    () => {
        expect(tokens.length).not.toBe(0); // Login has passed
        expect(templateIds.length).not.toBe(0);
        const deletes = [];
        for (const i in credentials) {
            const templateServiceForTest = new TemplateServiceForTest(tokens[i]);
            deletes.push(templateServiceForTest.deleteTemplate(templateIds[i]));
        }
        return Promise.all(deletes).then(templates => {
            let i = 0;
            for (const template of templates) {
                expect(template.templateId).toBe(templateIds[i]);
                i++;
            }
        });
    },
    TIMEOUT,
);

let collisionTemplateId = '';
it(
    `Collision - upload non unique`,
    () => {
        expect(tokens.length).not.toBe(0); // Login has passed

        const uploads = [];
        const file = readFileSync(resolve(__dirname, TEST_FILE));
        const name = `nonUniqueName-${Date.now()}`;
        for (const i in credentials) {
            const templateServiceForTest = new TemplateServiceForTest(tokens[i]);
            const upload = templateServiceForTest
                .uploadTemplate(name, file, TEST_FILE_FIELDS)
                .then(template => {
                    return template.templateId;
                })
                .catch(() => {
                    return false;
                });
            uploads.push(upload);
        }
        return Promise.all(uploads).then(results => {
            let successes = 0;
            let failures = 0;
            for (const result of results) {
                if (result) {
                    successes++;
                    collisionTemplateId = result.toString(); // if not false, must be templateId
                } else {
                    failures++;
                }
            }
            expect(successes).toBe(1);
            expect(failures).toBe(credentials.length - 1);
        });
    },
    TIMEOUT,
);

it(
    `Collision - delete non unique`,
    () => {
        expect(tokens.length).not.toBe(0); // Login has passed
        expect(collisionTemplateId).not.toBe(''); // upload for collision must pass
        const deletes = [];
        for (const i in credentials) {
            const templateServiceForTest = new TemplateServiceForTest(tokens[i]);
            const deleteOp = templateServiceForTest
                .deleteTemplate(collisionTemplateId)
                .then(() => {
                    return true;
                })
                .catch(() => {
                    return false;
                });
            deletes.push(deleteOp);
        }
        return Promise.all(deletes).then(results => {
            const atLeastOneSuccess = results.reduce((p, c) => {
                return p || c;
            }, false);
            expect(atLeastOneSuccess).toBe(true);
        });
    },
    TIMEOUT,
);
