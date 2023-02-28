import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { getUser, updateUserAttributes } from './cognitoClient';

const accountAlreadyInitializedError = 'account already exists.';

const headers = {
  'Content-Type': 'application/json'
};

const checkAccountStatus = async (AccessToken: string): Promise<void> => {
  const params = {
    AccessToken
  };
  const user = await getUser(params);
  if (user?.UserAttributes?.find((e) => e.Name === 'dev:custom:status')?.Value) {
    throw new Error(accountAlreadyInitializedError);
  }
};

const calculateExpired = (): number => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(date.getDate() - 1);
  date.setHours(23);
  date.setMinutes(59);
  date.setSeconds(0);
  return date.getTime();
};

const initAccount = async (Username: string): Promise<void> => {
  const params = {
    UserPoolId: process.env.UserPoolId,
    Username,
    UserAttributes: [
      { Name: 'dev:custom:status', Value: 'active' },
      { Name: 'dev:custom:expires', Value: calculateExpired().toString() },
      { Name: 'dev:custom:credit', Value: '0' },
      { Name: 'dev:custom:try', Value: 'true' }
    ]
  };
  await updateUserAttributes(params);
};

const lambdaHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
  try {
    const username: string = event.requestContext.authorizer.jwt.claims.username as string;
    const token = event.headers.authorization ?? '';
    await checkAccountStatus(token);
    await initAccount(username);
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'ok'
      })
    };
  } catch (err: unknown) {
    console.error({ err });
    const errMsg = err ? (err as Error).message : '';
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: `some error happened: ${errMsg}`
      })
    };
  }
};

export { lambdaHandler, accountAlreadyInitializedError };
