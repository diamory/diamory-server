import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from './dynamoDBClient';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DiamoryItem, DiamoryItemWithAccountId } from './item';

const notAllowedError = 'you are not allowed to do so';
const invalidItemError = 'invalid item';
const itemAlreadyExistsError = 'this item already exists. do update request instead';

interface AnyItem {
  [key: string]: unknown;
}

const checkAccount = async (accountId: string): Promise<void> => {
  const params = {
    Key: { accountId },
    TableName: 'diamory-account'
  };
  const command = new GetCommand(params);
  const { Item } = await dynamoDBClient.send(command);

  if (!Item) {
    throw new Error(notAllowedError);
  }
  if (Item.status !== 'active') {
    throw new Error(notAllowedError);
  }
};

const checkItem = (item: AnyItem): void => {
  const required = {
    id: 'string',
    checksum: 'string',
    payloadTimestamp: 'number',
    keepOffline: 'boolean'
  };
  for (const [key, value] of Object.entries(required)) {
    if (!(key in item) || typeof item[key] !== value) {
      throw new Error(invalidItemError);
    }
    if (key !== 'keepOffline' && !item[key]) {
      throw new Error(invalidItemError);
    }
  }
  if (!/^[A-Fa-f0-9]{64}$/u.test(item.checksum as string)) {
    throw new Error(invalidItemError);
  }
};

const addItem = async (Item: DiamoryItemWithAccountId): Promise<void> => {
  const params = {
    TableName: 'diamory-item',
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
    await checkAccount(accountId);
    const itemWithoutAccountId: DiamoryItem = JSON.parse(event.body ?? '{}');
    checkItem(itemWithoutAccountId as unknown as AnyItem);
    const item = {
      ...itemWithoutAccountId,
      accountId
    };
    await addItem(item);
    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'ok'
      })
    };
  } catch (err: unknown) {
    console.error({ err });
    const errMsg = err ? (err as Error).message : '';
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: `some error happened: ${errMsg}`
      })
    };
  }
};

export { lambdaHandler, notAllowedError, invalidItemError, itemAlreadyExistsError };
