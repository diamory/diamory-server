import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient, GetCommand, UpdateCommand } from './dynamoDBClient';
import { DiamoryItem, DiamoryItemWithAccountId } from './item';

const missingItemError = 'this item does not exist. do add request instead';
const invalidItemError = 'invalid item';

const itemTableName = 'diamory-item';

interface AnyItem {
  [key: string]: unknown;
}

const checkItemAlreadyExists = async (id: string, accountId: string): Promise<void> => {
  const params = {
    TableName: itemTableName,
    Key: { id, accountId }
  };
  const command = new GetCommand(params);
  const result = await dynamoDBClient.send(command);
  if (!(result?.Item?.id === id)) {
    throw new Error(missingItemError);
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

const updateItem = async (Item: DiamoryItemWithAccountId, id: string, accountId: string): Promise<void> => {
  const { checksum, payloadTimestamp, keepOffline } = Item;
  const params = {
    TableName: itemTableName,
    Key: { id, accountId },
    ExpressionAttributeValues: {
      ':checksum': checksum,
      ':payloadTimestamp': payloadTimestamp,
      ':keepOffline': keepOffline
    },
    UpdateExpression: 'set checksum = :checksum, payloadTimestamp = :payloadTimestamp, keepOffline = :keepOffline'
  };
  const command = new UpdateCommand(params);
  await dynamoDBClient.send(command);
};

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { accountId } = event.requestContext;
    const id = event.pathParameters?.id ?? '';
    await checkItemAlreadyExists(id, accountId);
    const itemWithoutAccountId: DiamoryItem = JSON.parse(event.body ?? '{}');
    const item = {
      ...itemWithoutAccountId,
      accountId
    };
    checkItem(item);
    await updateItem(item, id, accountId);
    return {
      statusCode: 200,
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

export { lambdaHandler, missingItemError, invalidItemError };
