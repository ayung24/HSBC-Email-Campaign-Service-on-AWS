import { config } from './config';
import { awsEndpoints } from './awsEndpoints';

export const awsAuthConfiguration = {
    // OPTIONAL - if your API requires authentication
    Auth: {
        // REQUIRED - Amazon Cognito Identity Pool ID
        identityPoolId: config.cognito.IDENTITY_POOL_ID,
        // REQUIRED - Amazon Cognito Region
        region: config.cognito.REGION,
        // OPTIONAL - Amazon Cognito User Pool ID
        userPoolId: config.cognito.USER_POOL_ID,
        // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)
        userPoolWebClientId: config.cognito.WEB_CLIENT_ID,
    },
    API: {
        endpoints: awsEndpoints,
    },
};
