import { APIGatewayProxyEvent } from 'aws-lambda';

const accountId = '123456789012';

const buildTestEvent = (method: string, path: string, body: object = {}): APIGatewayProxyEvent => {
    return {
        httpMethod: method,
        body: JSON.stringify(body),
        headers: {},
        isBase64Encoded: false,
        multiValueHeaders: {},
        multiValueQueryStringParameters: {},
        path: path,
        pathParameters: {},
        queryStringParameters: {},
        requestContext: {
            accountId,
            apiId: '1234',
            authorizer: {
                jwt: {
                    claims: {
                        username: 'testuser',
                    },
                },
            },
            httpMethod: method,
            identity: {
                accessKey: '',
                accountId: '',
                apiKey: '',
                apiKeyId: '',
                caller: '',
                clientCert: {
                    clientCertPem: '',
                    issuerDN: '',
                    serialNumber: '',
                    subjectDN: '',
                    validity: { notAfter: '', notBefore: '' },
                },
                cognitoAuthenticationProvider: '',
                cognitoAuthenticationType: '',
                cognitoIdentityId: '',
                cognitoIdentityPoolId: '',
                principalOrgId: '',
                sourceIp: '',
                user: '',
                userAgent: '',
                userArn: '',
            },
            path,
            protocol: 'HTTP/1.1',
            requestId: 'c6af9ac6-7b61-11e6-9a41-93e8deadbeef',
            requestTimeEpoch: 1428582896000,
            resourceId: '123456',
            resourcePath: path,
            stage: 'dev',
        },
        resource: '',
        stageVariables: {},
    };
};

export { buildTestEvent, accountId };