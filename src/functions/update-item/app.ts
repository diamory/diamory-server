import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from './dynamoDBClient';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DiamoryItem, DiamoryItemWithAccountId } from './item';

const missingItemError = 'this item does not exist. do add request instead';
const invalidItemError = 'invalid item';

const itemTableName = 'diamory-item';

interface AnyItem {
  [key: string]: unknown;
}

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
      ':keepOffline': keepOffline,
      ':id': id,
      ':accountId': accountId
    },
    ConditionExpression: 'id = :id and accountId = :accountId',
    UpdateExpression: 'set checksum = :checksum, payloadTimestamp = :payloadTimestamp, keepOffline = :keepOffline'
  };
  const command = new UpdateCommand(params);
  try {
    await dynamoDBClient.send(command);
  } catch {
    throw new Error(missingItemError);
  }
};

const lambdaHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
  try {
    const accountId: string = event.requestContext.authorizer.jwt.claims.sub as string;
    const id = event.pathParameters?.id ?? '';
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
