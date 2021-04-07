import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';

const getDefaults = (): APIGatewayRequestAuthorizerEvent => ({
    type: "REQUEST",
    methodArn: "arn:aws:execute-api:us-west-2:123456789012:ymy8tbxw7b/*/GET/",
    resource: '/',
    path: '/prod/',
    httpMethod: 'GET',
    headers: null,
    multiValueHeaders: null,
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
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
        authorizer: undefined,
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
        }
    }
});

export function APIGatewayRequestAuthorizerEventMockBuilder(p?: Partial<APIGatewayRequestAuthorizerEvent>): APIGatewayRequestAuthorizerEvent {
    return {
        ...getDefaults(),
        ...p,
    };
}
