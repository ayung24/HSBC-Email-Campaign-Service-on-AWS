export const config = {
    cognito: {
        REGION: 'ca-central-1',
        USER_POOL_ID: 'ca-central-1_LtJbCIl1y',
        WEB_CLIENT_ID: '7mvk4hodjmi029298hemi67c24',
        IDENTITY_POOL_ID: 'ca-central-1:097f9420-9dbf-4ee9-a9f6-f4ed5c610e10',
    },
    lambda: {
        LAMBDA_ROOT: 'src/lambda',
    },
    secretsManager: {
        ACCOUNT_ID: '353747297524',
        REGION: 'ca-central-1',
        SECRET_NAME: 'API_Key_Secret',
        SECRET_SUFFIX: 'ORGVxe',
    },
    dynamo: {
        apiVersion: '2019.11. 21',
    },
    s3: {
        PRESIGNED_URL_EXPIRY: '600',
    },
};
