import { config } from './config';

let region, deploymentID;
if (process.env.REACT_APP_BUILD_ENV && process.env.REACT_APP_BUILD_ENV === 'prod') {
    region = config.api.REGION_PROD;
    deploymentID = config.api.DEPLOYMENT_ID_PROD;
} else {
    region = config.api.REGION_DEV;
    deploymentID = config.api.DEPLOYMENT_ID_DEV;
}
const apiUrl = `https://${deploymentID}.execute-api.${region}.amazonaws.com/prod`;

export const awsEndpoints = [
    {
        name: 'prod',
        endpoint: `${apiUrl}`,
    },
];
