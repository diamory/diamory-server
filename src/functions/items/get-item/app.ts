import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from './dynamoDBClient';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

const missingItemError = 'this item does not exist';

const headers = {
  'Content-Type': 'application/json'
};

interface AnyItem {
  [key: string]: unknown;
}

const getItem = async (id: string, accountId: string): Promise<AnyItem | undefined> => {
  const params = {
    TableName: process.env.ItemTableName,
    Key: { id, accountId }
  };
  const command = new GetCommand(params);
  try {
    const responnse = await dynamoDBClient.send(command);
    return responnse.Item;
  } catch {
    throw new Error(missingItemError);
  }
};

const lambdaHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
  try {
    const accountId: string = event.requestContext.authorizer.jwt.claims.sub as string;
    const id = event.pathParameters?.id ?? '';
    const item = await getItem(id, accountId);
    if (!item) {
      throw new Error(missingItemError);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accountId: unused, ...itemProperties } = item;
    return {
      statusCode: 200,
      headers,
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
      headers,
      body: JSON.stringify({
        message: `some error happened: ${errMsg}`,
        item: null
      })
    };
  }
};

export { lambdaHandler, missingItemError };
