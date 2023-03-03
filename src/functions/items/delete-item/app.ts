import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from './dynamoDBClient';
import { getUser } from './cognitoClient';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';

const missingItemError = 'this item does not exist. do add request instead';
const notAllowedError = 'you are not allowed to do so';

const headers = {
  'Content-Type': 'application/json'
};

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

const deleteItem = async (id: string, accountId: string): Promise<boolean> => {
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
    return true;
  } catch {
    return false;
  }
};

const success200Response = (): APIGatewayProxyResult => {
  return {
    statusCode: 200,
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
    const id = event.pathParameters?.id ?? '';
    if (!(await isActiveAccount(token))) {
      return error4xxResponse(403, notAllowedError);
    }
    if (!(await deleteItem(id, accountId))) {
      return error4xxResponse(404, missingItemError);
    }
    return success200Response();
  } catch (err: unknown) {
    console.error({ err });
    return error500Response(err);
  }
};

export { lambdaHandler, missingItemError, notAllowedError };
