import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { disableUser } from './cognitoClient';
import { dynamoDBClient } from './dynamoDBClient';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

const invalidStatusError = 'account does not exist or has invalid status.';

const UserPoolId = process.env.UserPool;

const headers = {
  'Content-Type': 'application/json'
};

const disableTheUser = async (Username: string): Promise<void> => {
  const params = { UserPoolId, Username };
  await disableUser(params);
};

const disableTheAccount = async (accountId: string): Promise<boolean> => {
  const params = {
    TableName: process.env.AccountTableName,
    Key: { v: 1, accountId },
    ExpressionAttributeValues: {
      ':accountId': accountId,
      ':status': 'disabled'
    },
    ExpressionAttributeNames: {
      '#s': 'status'
    },
    ConditionExpression: 'accountId = :accountId and #s <> :status',
    UpdateExpression: 'set #s = :status'
  };
  const command = new UpdateCommand(params);
  try {
    await dynamoDBClient.send(command);
    return true;
  } catch {
    return false;
  }
};

const success200Response = (): APIGatewayProxyResult => {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'ok'
    })
  };
};

const errorInvalidStatusResponse = (): APIGatewayProxyResult => {
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({
      message: `some error happened: ${invalidStatusError}`
    })
  };
};

const error500Response = (err: unknown): APIGatewayProxyResult => {
  const errMsg = err ? (err as Error).message : '';
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({
      message: `some error happened: ${errMsg}`
    })
  };
};

const lambdaHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
  try {
    const username: string = event.requestContext.authorizer.jwt.claims.username as string;
    const accountId: string = event.requestContext.authorizer.jwt.claims.sub as string;
    if (!(await disableTheAccount(accountId))) {
      return errorInvalidStatusResponse();
    }
    await disableTheUser(username);
    return success200Response();
  } catch (err: unknown) {
    console.error({ err });
    return error500Response(err);
  }
};

export { lambdaHandler, invalidStatusError };
