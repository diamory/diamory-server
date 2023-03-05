import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from './dynamoDBClient';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DiamoryItem, StoredDiamoryItem } from './item';

const invalidStatusError = 'account does not exist or has invalid status.';
const invalidItemError = 'invalid item';
const itemAlreadyExistsError = 'this item already exists. do update request instead';

const headers = {
  'Content-Type': 'application/json'
};

interface AnyItem {
  [key: string]: unknown;
}

const isActiveAccount = async (accountId: string): Promise<boolean> => {
  const params = {
    TableName: process.env.AccountTableName,
    Key: { v: 1, accountId }
  };
  const command = new GetCommand(params);
  const status = (await dynamoDBClient.send(command))?.Item?.status;
  if (status) {
    return status === 'active';
  }
  return false;
};

const isValidItem = (item: AnyItem): boolean => {
  const required = {
    id: 'string',
    checksum: 'string',
    payloadTimestamp: 'number'
  };
  for (const [key, value] of Object.entries(required)) {
    if (!(key in item) || typeof item[key] !== value) {
      return false;
    }
    if (!item[key]) {
      return false;
    }
  }
  if (!/^[A-Fa-f0-9]{64}$/u.test(item.checksum as string)) {
    return false;
  }
  return true;
};

const addItem = async (Item: StoredDiamoryItem): Promise<boolean> => {
  const params = {
    TableName: process.env.ItemTableName,
    Item,
    ConditionExpression: 'attribute_not_exists(id)'
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

const error4xxResponse = (statusCode: number, errMsg: string): APIGatewayProxyResult => {
  return {
    statusCode,
    headers,
    body: JSON.stringify({
      message: `some error happened: ${errMsg}`
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
    const accountId: string = event.requestContext.authorizer.jwt.claims.sub as string;
    const givenItem: DiamoryItem = JSON.parse(event.body ?? '{}');
    if (!(await isActiveAccount(accountId))) {
      return error4xxResponse(403, invalidStatusError);
    }
    if (!isValidItem(givenItem as unknown as AnyItem)) {
      return error4xxResponse(400, invalidItemError);
    }
    const item: StoredDiamoryItem = {
      v: 1,
      accountId,
      ...givenItem
    };
    if (!(await addItem(item))) {
      return error4xxResponse(400, itemAlreadyExistsError);
    }
    return success201Response();
  } catch (err: unknown) {
    console.error({ err });
    return error500Response(err);
  }
};

export { lambdaHandler, invalidStatusError, invalidItemError, itemAlreadyExistsError };
