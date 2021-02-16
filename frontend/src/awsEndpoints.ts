import { config } from './config';

const prodUrl = `https://${config.api.DEPLOYMENT_ID}.execute-api.ca-central-1.amazonaws.com/prod`;

export const awsEndpoints = [
    {
        name: 'prod',
        endpoint: `${prodUrl}`,
    },
];
