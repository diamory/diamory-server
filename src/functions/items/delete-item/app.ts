import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from './dynamoDBClient';
import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const missingItemError = 'this item does not exist. do add request instead';
const notAllowedError = 'you are not allowed to do so';

const headers = {
  'Content-Type': 'application/json'
};

const checkAccountStatus = async (accountId: string): Promise<void> => {
  const params = {
    Key: { accountId },
    TableName: process.env.AccountTableName
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

const deleteItem = async (id: string, accountId: string): Promise<void> => {
  const params = {
    TableName: process.env.ItemTableName,
    Key: { id, accountId },
    ExpressionAttributeValues: {
      ':id': id,
      ':accountId': accountId
    },
    ConditionExpression: 'id = :id and accountId = :accountId'
  };
  const command = new DeleteCommand(params);
  try {
    await dynamoDBClient.send(command);
  } catch {
    throw new Error(missingItemError);
  }
};

const lambdaHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
  try {
    const accountId: string = event.requestContext.authorizer.jwt.claims.sub as string;
    await checkAccountStatus(accountId);
    const id = event.pathParameters?.id ?? '';
    await deleteItem(id, accountId);
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

export { lambdaHandler, missingItemError, notAllowedError };
