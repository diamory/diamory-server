import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyEventPathParameters } from 'aws-lambda';

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
): APIGatewayProxyEventV2WithJWTAuthorizer => {
  const { path, pathParameters } = applicateParameters(pathWithPlaceholders, parameters);
  return {
    body: JSON.stringify(body),
    headers: {},
    isBase64Encoded: false,
    pathParameters,
    queryStringParameters: {},
    requestContext: {
      accountId: '42',
      apiId: '1234',
      authorizer: {
        principalId: '',
        integrationLatency: 0,
        jwt: {
          claims: {
            username: 'testuser',
            sub: accountId
          },
          scopes: ['']
        }
      },
      requestId: 'c6af9ac6-7b61-11e6-9a41-93e8deadbeef',
      stage: 'dev',
      domainName: 'localhost',
      domainPrefix: '',
      routeKey: `${method} ${pathWithPlaceholders}`,
      time: '0',
      timeEpoch: 0,
      http: {
        method,
        path,
        protocol: 'http',
        sourceIp: '127.0.0.1',
        userAgent: 'jest'
      }
    },
    stageVariables: {},
    version: '2.0',
    rawPath: path,
    rawQueryString: '',
    routeKey: `${method} ${pathWithPlaceholders}`
  };
};

export { buildTestEvent, accountId };
