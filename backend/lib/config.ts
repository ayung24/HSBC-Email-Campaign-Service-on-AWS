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
    KMS: {
        REGION: 'ca-central-1',
        KEY_ID: 'arn:aws:kms:ca-central-1:353747297524:key/b2c01359-6245-4303-abfb-ee8b49f65e1e',
    },
    dynamo: {
        apiVersion: '2019.11. 21',
    },
    s3: {
        PRESIGNED_URL_EXPIRY: '600',
    },
};
