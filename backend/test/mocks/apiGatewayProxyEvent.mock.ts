import { APIGatewayProxyEvent } from 'aws-lambda';

const getDefaults = (): APIGatewayProxyEvent => ({
    resource: '/',
    path: '/',
    httpMethod: 'GET',
    requestContext: {
        resourceId: 'resourceId',
        resourcePath: '/',
        httpMethod: 'GET',
        path: '/prod/',
        requestId: 'requestId',
        requestTimeEpoch: 0,
        accountId: 'accountId',
        protocol: 'HTTP/1.1',
        apiId: 'apiId',
        authorizer: null,
        stage: 'prod',
        identity: {
            cognitoIdentityPoolId: null,
            accountId: null,
            cognitoIdentityId: null,
            caller: null,
            sourceIp: 'sourceIp',
            principalOrgId: null,
            accessKey: null,
            cognitoAuthenticationType: null,
            cognitoAuthenticationProvider: null,
            userArn: null,
            userAgent: 'userAgent',
            user: null,
            apiKey: null,
            apiKeyId: null,
        },
    },
    headers: {},
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    body: null,
    isBase64Encoded: false,
});

export function ApiGatewayProxyEventMockBuilder(p?: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent {
    return {
        ...getDefaults(),
        ...p,
    };
}
