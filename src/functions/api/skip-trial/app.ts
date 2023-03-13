import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from './dynamoDBClient';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Account } from './account';

const notPaidEnoughError = 'not paid enough.';
const isNotTrialError = 'is not trial.';
const missingAccountError = 'account does not exist.';
const invalidStatusError = 'account does not exist or has invalid status.';

const TableName = process.env.AccountTableName;

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

const getAccount = async (accountId: string): Promise<Account | undefined> => {
  const params = {
    TableName,
    Key: { v: 1, accountId }
  };
  const command = new GetCommand(params);
  const { Item } = await dynamoDBClient.send(command);
  if (Item?.accountId === accountId) {
    return Item as unknown as Account;
  }
  return undefined;
};

const skipTrial = async (accountId: string, times: number): Promise<void> => {
  const params = {
    TableName,
    Key: { v: 1, accountId },
    ExpressionAttributeValues: {
      ':times': times,
      ':trial': false,
      ':expires': calculateExpires()
    },
    UpdateExpression: 'set times = :times, trial = :trial, expires = :expires'
  };
  const command = new UpdateCommand(params);
  await dynamoDBClient.send(command);
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

const error4xxResponse = (statusCode: number, errMsg: string): APIGatewayProxyResult => {
  return {
    statusCode,
    headers,
    body: JSON.stringify({
      message: errMsg
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
    const account = await getAccount(accountId);
    if (!account) {
      return error4xxResponse(404, missingAccountError);
    }
    const { times, trial, status } = account;
    if (times < 1) {
      return error4xxResponse(403, notPaidEnoughError);
    }
    if (!trial) {
      return error4xxResponse(400, isNotTrialError);
    }
    if (status === 'disabled') {
      return error4xxResponse(403, invalidStatusError);
    }
    await skipTrial(accountId, times - 1);
    return success200Response();
  } catch (err: unknown) {
    console.error({ err });
    return error500Response(err);
  }
};

export { lambdaHandler, notPaidEnoughError, isNotTrialError, missingAccountError, invalidStatusError };
