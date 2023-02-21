import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from './dynamoDBClient';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { DiamoryItem, DiamoryItemWithAccountId } from './item';

const notAllowedError = 'you are not allowed to do so';
const invalidItemError = 'invalid item';
const itemAlreadyExistsError = 'this item already exists. do update request instead';

const headers = {
  'Content-Type': 'application/json'
};

interface AnyItem {
  [key: string]: unknown;
}

const checkAccountStatus = (status: string, requiredStatus: string): void => {
  if (status !== requiredStatus) {
    throw new Error(notAllowedError);
  }
};

const checkItem = (item: AnyItem): void => {
  const required = {
    id: 'string',
    checksum: 'string',
    payloadTimestamp: 'number'
  };
  for (const [key, value] of Object.entries(required)) {
    if (!(key in item) || typeof item[key] !== value) {
      throw new Error(invalidItemError);
    }
    if (!item[key]) {
      throw new Error(invalidItemError);
    }
  }
  if (!/^[A-Fa-f0-9]{64}$/u.test(item.checksum as string)) {
    throw new Error(invalidItemError);
  }
};

const addItem = async (Item: DiamoryItemWithAccountId): Promise<void> => {
  const params = {
    TableName: process.env.ItemTableName,
    Item,
    ConditionExpression: 'attribute_not_exists(id)'
  };
  const command = new PutCommand(params);
  try {
    await dynamoDBClient.send(command);
  } catch {
    throw new Error(itemAlreadyExistsError);
  }
};

const lambdaHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
  try {
    const accountId: string = event.requestContext.authorizer.jwt.claims.sub as string;
    const status: string = event.requestContext.authorizer.jwt.claims.status as string;
    checkAccountStatus(status, 'active');
    const itemWithoutAccountId: DiamoryItem = JSON.parse(event.body ?? '{}');
    checkItem(itemWithoutAccountId as unknown as AnyItem);
    const item = {
      ...itemWithoutAccountId,
      accountId
    };
    await addItem(item);
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

export { lambdaHandler, notAllowedError, invalidItemError, itemAlreadyExistsError };
