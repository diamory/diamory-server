import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from './dynamoDBClient';
import { getUser } from './cognitoClient';
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

const isActiveAccount = async (AccessToken: string): Promise<boolean> => {
  const params = {
    AccessToken
  };
  const user = await getUser(params);
  const status = user?.UserAttributes?.find((e) => e.Name === 'dev:custom:status')?.Value;
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

const addItem = async (Item: DiamoryItemWithAccountId): Promise<boolean> => {
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
    const token = event.headers.authoization ?? '';
    const itemWithoutAccountId: DiamoryItem = JSON.parse(event.body ?? '{}');
    if (!(await isActiveAccount(token))) {
      return error4xxResponse(403, notAllowedError);
    }
    if (!isValidItem(itemWithoutAccountId as unknown as AnyItem)) {
      return error4xxResponse(400, invalidItemError);
    }
    const item = {
      ...itemWithoutAccountId,
      accountId
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

export { lambdaHandler, notAllowedError, invalidItemError, itemAlreadyExistsError };
