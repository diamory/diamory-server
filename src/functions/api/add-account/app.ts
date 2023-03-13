import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from './dynamoDBClient';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { Account } from './account';

const accountAlreadyCreatedError = 'account already exists.';

const headers = {
  'Content-Type': 'application/json'
};

const calculateExpires = (): number => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(date.getDate() - 1);
  date.setHours(23);
  date.setMinutes(59);
  date.setSeconds(0);
  return date.getTime();
};

const addAccount = async (accountId: string, username: string): Promise<boolean> => {
  const Item: Account = {
    v: 1,
    accountId,
    username,
    status: 'active',
    suspended: 0,
    times: 0,
    expires: calculateExpires(),
    trial: true
  };
  const params = {
    TableName: process.env.AccountTableName,
    Item,
    ConditionExpression: 'attribute_not_exists(accountId)'
  };
  const command = new PutCommand(params);
  try {
    await dynamoDBClient.send(command);
    return true;
  } catch {
    return false;
  }
};

const success201Response = (): APIGatewayProxyResult => {
  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      message: 'ok'
    })
  };
};

const errorAlreadyCreatedResponse = (): APIGatewayProxyResult => {
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({
      message: accountAlreadyCreatedError
    })
  };
};

const error500Response = (err: unknown): APIGatewayProxyResult => {
  const errMsg = err ? (err as Error).message : '';
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({
      message: errMsg
    })
  };
};

const lambdaHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
  try {
    const accountId: string = event.requestContext.authorizer.jwt.claims.sub as string;
    const username: string = event.requestContext.authorizer.jwt.claims.username as string;
    if (!(await addAccount(accountId, username))) {
      return errorAlreadyCreatedResponse();
    }
    return success201Response();
  } catch (err: unknown) {
    console.error({ err });
    return error500Response(err);
  }
};

export { lambdaHandler, accountAlreadyCreatedError };
