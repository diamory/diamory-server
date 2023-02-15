import { APIGatewayProxyEvent, APIGatewayProxyEventPathParameters } from 'aws-lambda';

interface PathParametersAndPath {
  path: string;
  pathParameters: APIGatewayProxyEventPathParameters;
}

const accountId = '123456789012';

const applicateParameters = (pathWithPlaceholders: string, parameters: string[]): PathParametersAndPath => {
  let path = pathWithPlaceholders;
  const pathParameters: APIGatewayProxyEventPathParameters = {};
  const pathAndPathParameters = { path, pathParameters };
  const pathVars = pathWithPlaceholders.match(/\{.+?}/g);
  if (!pathVars) {
    return pathAndPathParameters;
  }

  for (let i = 0; i < parameters.length; i++) {
    path = path.replace(pathVars[i], parameters[i]);
    const varName = pathVars[i].replace(/\{(.+?)}/, '$1');
    pathParameters[varName] = parameters[i];
  }
  return pathAndPathParameters;
};

const buildTestEvent = (
  method: string,
  pathWithPlaceholders: string,
  parameters: string[],
  body: object
): APIGatewayProxyEvent => {
  const { path, pathParameters } = applicateParameters(pathWithPlaceholders, parameters);
  return {
    httpMethod: method,
    body: JSON.stringify(body),
    headers: {},
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: {},
    path,
    pathParameters,
    queryStringParameters: {},
    requestContext: {
      accountId,
      apiId: '1234',
      authorizer: {
        jwt: {
          claims: {
            username: 'testuser'
          }
        }
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
          validity: { notAfter: '', notBefore: '' }
        },
        cognitoAuthenticationProvider: '',
        cognitoAuthenticationType: '',
        cognitoIdentityId: '',
        cognitoIdentityPoolId: '',
        principalOrgId: '',
        sourceIp: '',
        user: '',
        userAgent: '',
        userArn: ''
      },
      path,
      protocol: 'HTTP/1.1',
      requestId: 'c6af9ac6-7b61-11e6-9a41-93e8deadbeef',
      requestTimeEpoch: 1428582896000,
      resourceId: '123456',
      resourcePath: path,
      stage: 'dev'
    },
    resource: '',
    stageVariables: {}
  };
};

export { buildTestEvent, accountId };
