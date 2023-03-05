import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from './dynamoDBClient';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

const missingItemError = 'this item does not exist';
const invalidStatusError = 'account does not exist or has invalid status.';

const headers = {
  'Content-Type': 'application/json'
};

interface AnyItem {
  [key: string]: unknown;
}

const isEnabledAccount = async (accountId: string): Promise<boolean> => {
  const params = {
    TableName: process.env.AccountTableName,
    Key: { v: 1, accountId }
  };
  const command = new GetCommand(params);
  const status = (await dynamoDBClient.send(command))?.Item?.status;
  if (status) {
    return status !== 'disabled';
  }
  return false;
};

const getItem = async (id: string, accountId: string): Promise<AnyItem | undefined> => {
  const params = {
    TableName: process.env.ItemTableName,
    Key: { id, accountId }
  };
  const command = new GetCommand(params);
  try {
    const responnse = await dynamoDBClient.send(command);
    return responnse.Item;
  } catch {
    throw new Error(missingItemError);
  }
};

const success200Response = (Item: AnyItem): APIGatewayProxyResult => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { accountId, v, ...item } = Item;
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'ok',
      item
    })
  };
};

const error4xxResponse = (statusCode: number, errMsg: string): APIGatewayProxyResult => {
  return {
    statusCode,
    headers,
    body: JSON.stringify({
      message: `some error happened: ${errMsg}`,
      item: null
    })
  };
};

const error500Response = (err: unknown): APIGatewayProxyResult => {
  const errMsg = err ? (err as Error).message : '';
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({
      message: `some error happened: ${errMsg}`,
      item: null
    })
  };
};

const lambdaHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
  try {
    const accountId: string = event.requestContext.authorizer.jwt.claims.sub as string;
    const id = event.pathParameters?.id ?? '';
    if (!(await isEnabledAccount(accountId))) {
      return error4xxResponse(403, invalidStatusError);
    }
    const item = await getItem(id, accountId);
    if (!item) {
      return error4xxResponse(404, missingItemError);
    }
    return success200Response(item);
  } catch (err: unknown) {
    console.error({ err });
    return error500Response(err);
  }
};

export { lambdaHandler, missingItemError, invalidStatusError };
