import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from './dynamoDBClient';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

const missingItemError = 'this item does not exist';

interface AnyItem {
  [key: string]: unknown;
}

const getItem = async (id: string, accountId: string): Promise<AnyItem | undefined> => {
  const params = {
    TableName: 'diamory-item',
    Key: { id, accountId }
  };
  const command = new GetCommand(params);
  const responnse = await dynamoDBClient.send(command);
  return responnse.Item;
};

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { accountId } = event.requestContext;
    const id = event.pathParameters?.id ?? '';
    const item = await getItem(id, accountId);
    if (!item) {
      throw new Error(missingItemError);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accountId: unused, ...itemProperties } = item;
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'ok',
        item: { ...itemProperties }
      })
    };
  } catch (err: unknown) {
    console.error({ err });
    const errMsg = err ? (err as Error).message : '';
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: `some error happened: ${errMsg}`,
        item: null
      })
    };
  }
};

export { lambdaHandler, missingItemError };
