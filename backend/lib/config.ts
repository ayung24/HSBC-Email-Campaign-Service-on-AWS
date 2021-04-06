export const config = {
    cognito: {
        // Tony's user pool
        REGION: 'ca-central-1',
        USER_POOL_ID: 'ca-central-1_RLUHbJ5Dc',
        WEB_CLIENT_ID: '32ngp9karu2tudtmvkloi8fhjd',
        IDENTITY_POOL_ID: 'ca-central-1:f7828a71-cd4e-4b75-8eee-18653dc0c48e',
        // Philip's user pool
        // REGION: 'ca-central-1',
        // USER_POOL_ID: 'ca-central-1_LtJbCIl1y',
        // WEB_CLIENT_ID: '7mvk4hodjmi029298hemi67c24',
        // IDENTITY_POOL_ID: 'ca-central-1:097f9420-9dbf-4ee9-a9f6-f4ed5c610e10',
    },
    lambda: {
        LAMBDA_ROOT: 'src/lambda',
        BUILD_TARGET: 'es2018',
    },
    KMS: {
        REGION: 'ca-central-1',
        ACCOUNT_ID: '353747297524',
        KEY_ID: 'b2c01359-6245-4303-abfb-ee8b49f65e1e',
    },
    dynamo: {
        apiVersion: '2019.11. 21',
    },
    s3: {
        PRESIGNED_URL_EXPIRY: '600',
        SRC_HTML_PATH: 'src/',
        PROCESSED_HTML_PATH: 'processed/',
    },
    ses: {
        VERSION: '2010-12-01',
        VERIFIED_EMAIL_ADDRESS: 'makebank.testmain@gmail.com',
        MAX_SEND_RATE: 1, // email per second
    },
    sqs: {
        VERSION: '2012-11-05',
        BATCH_SIZE: 5,
        MAX_RECEIVE_COUNT: 5,
        MAX_CONCURRENT_SEND_LAMBDA_COUNT: 5,
        SEND_LAMBDA_TIMEOUT: 20,
    },
};
