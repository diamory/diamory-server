import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from './dynamoDBClient';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DiamoryItem, DiamoryItemWithAccountId } from './item';

const missingItemError = 'this item does not exist. do add request instead';
const invalidItemError = 'invalid item';
const notAllowedError = 'you are not allowed to do so';

const itemTableName = 'diamory-item';

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

const updateItem = async (Item: DiamoryItemWithAccountId, accountId: string): Promise<void> => {
  const { id, checksum, payloadTimestamp } = Item;
  const params = {
    TableName: itemTableName,
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
  } catch {
    throw new Error(missingItemError);
  }
};

const lambdaHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
  try {
    const accountId: string = event.requestContext.authorizer.jwt.claims.sub as string;
    const status: string = event.requestContext.authorizer.jwt.claims.status as string;
    checkAccountStatus(status, 'active');
    const itemWithoutAccountId: DiamoryItem = JSON.parse(event.body ?? '{}');
    const item = {
      ...itemWithoutAccountId,
      accountId
    };
    checkItem(item);
    await updateItem(item, accountId);
    return {
      statusCode: 200,
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

export { lambdaHandler, missingItemError, invalidItemError, notAllowedError };
