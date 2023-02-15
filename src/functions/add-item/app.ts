import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient, PutCommand, GetCommand } from './dynamoDBClient';
import { DiamoryItem, DiamoryItemWithAccountId } from './item';

const notAllowedError = 'you are not allowed to do so';
const invalidItemError = 'invalid item';

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
  const params = { TableName: 'diamory-item', Item };
  const command = new PutCommand(params);
  await dynamoDBClient.send(command);
};

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { accountId } = event.requestContext;
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

export { lambdaHandler, notAllowedError, invalidItemError };
