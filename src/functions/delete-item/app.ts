import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from './dynamoDBClient';
import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const missingItemError = 'this item does not exist. do add request instead';
const notAllowedError = 'you are not allowed to do so';

const itemTableName = 'diamory-item';

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

const checkItemExists = async (id: string, accountId: string): Promise<void> => {
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

const deleteItem = async (id: string, accountId: string): Promise<void> => {
  const params = {
    TableName: itemTableName,
    Key: { id, accountId }
  };
  const command = new DeleteCommand(params);
  await dynamoDBClient.send(command);
};

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { accountId } = event.requestContext;
    await checkAccount(accountId);
    const id = event.pathParameters?.id ?? '';
    await checkItemExists(id, accountId);
    await deleteItem(id, accountId);
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

export { lambdaHandler, missingItemError, notAllowedError };
