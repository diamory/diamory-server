import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from './dynamoDBClient';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DiamoryItem, DiamoryItemWithAccountId } from './item';

const missingItemError = 'this item does not exist. do add request instead';
const invalidItemError = 'invalid item';
const notAllowedError = 'you are not allowed to do so';

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

const updateItem = async (Item: DiamoryItemWithAccountId, accountId: string): Promise<boolean> => {
  const { id, checksum, payloadTimestamp } = Item;
  const params = {
    TableName: process.env.ItemTableName,
    Key: { id, accountId },
    ExpressionAttributeValues: {
      ':checksum': checksum,
      ':payloadTimestamp': payloadTimestamp,
      ':id': id,
      ':accountId': accountId
    },
    ConditionExpression: 'id = :id and accountId = :accountId',
    UpdateExpression: 'set checksum = :checksum, payloadTimestamp = :payloadTimestamp'
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
    const itemWithoutAccountId: DiamoryItem = JSON.parse(event.body ?? '{}');
    if (!(await isActiveAccount(accountId))) {
      return error4xxResponse(403, notAllowedError);
    }
    if (!isValidItem(itemWithoutAccountId as unknown as AnyItem)) {
      return error4xxResponse(400, invalidItemError);
    }
    const item = {
      ...itemWithoutAccountId,
      accountId
    };
    if (!(await updateItem(item, accountId))) {
      return error4xxResponse(404, missingItemError);
    }
    return success200Response();
  } catch (err: unknown) {
    console.error({ err });
    return error500Response(err);
  }
};

export { lambdaHandler, missingItemError, invalidItemError, notAllowedError };
