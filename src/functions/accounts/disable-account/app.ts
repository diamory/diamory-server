import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { disableUser } from './cognitoClient';

const headers = {
  'Content-Type': 'application/json'
};

const disableAccount = async (Username: string): Promise<void> => {
  const params = {
    UserPoolId: process.env.UserPoolId,
    Username
  };
  await disableUser(params);
};

const lambdaHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
  try {
    const username: string = event.requestContext.authorizer.jwt.claims.username as string;
    await disableAccount(username);
    return {
      statusCode: 200,
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

export { lambdaHandler };
