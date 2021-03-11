export const config = {
    cognito: {
        REGION: 'ca-central-1',
        USER_POOL_ID: 'ca-central-1_LtJbCIl1y',
        WEB_CLIENT_ID: '7mvk4hodjmi029298hemi67c24',
        IDENTITY_POOL_ID: 'ca-central-1:097f9420-9dbf-4ee9-a9f6-f4ed5c610e10',
    },
    api: {
        REGION_DEV: 'us-west-2',
        DEPLOYMENT_ID_DEV: '9efko4e2og',
        REGION_PROD: 'ca-central-1',
        DEPLOYMENT_ID_PROD: 'e3jwjhbiz1',
    },
    cloudWatch: {
        // These keys allow frontend to log to CloudWatch directly
        // If you wish to see logs generated by the frontend:
        // 1. Add a new IAM user to your AWS account
        //    - Name it something like 'cloudwatch-logger`
        //    - Access type: Programmatic access
        //    - Permissions: Attach existing policies directly -> CloudWatchFullAccess
        // 2. Note the Access key ID and Secret access key, add below to a commented out section
        // TODO NOTE IMPORTANT!!!: (marking todo because it highlights the text)
        //  The secret key cannot be retrieved again, so make sure you write it here before exiting the create user workflow
        // 3. Comment out the dev and prod keys and use your own
        // 4. For dev purposes, you will need to change REGION_DEV to wherever you need
        // PROD and DEV keys (Tianyan's keys)
        ACCESS_KEY: 'AKIAVEXH3MT2KSSOHUAB',
        SECRET_KEY: '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',
        // Philip's keys
        // ACCESS_KEY: 'AKIAROBCJI367XPAB7WK',
        // SECRET_KEY: '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',
        REGION_DEV: 'us-west-2',
        REGION_PROD: 'ca-central-1',
    },
};
