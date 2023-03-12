import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { s3Client } from './s3Client';
import { DeleteObjectCommand, DeleteObjectCommandInput } from '@aws-sdk/client-s3';
import { dynamoDBClient } from './dynamoDBClient';
import { GetCommand, GetCommandInput } from '@aws-sdk/lib-dynamodb';

const invalidStatusError = 'account does not exist or has invalid status.';

const headers = {
  'Content-Type': 'application/json'
};

const isActiveAccount = async (accountId: string): Promise<boolean> => {
  const params: GetCommandInput = {
    TableName: process.env.AccountTableName,
    Key: { v: 1, accountId }
  };
  const command = new GetCommand(params);
  const status = (await dynamoDBClient.send(command))?.Item?.status;
  if (status) {
    return status === 'active';
  }
  return false;
};

const removeItem = async (accountId: string, id: string): Promise<void> => {
  const params: DeleteObjectCommandInput = {
    Bucket: process.env.PayloadsBucketName,
    Key: `${accountId}/${id}`
  };
  const command = new DeleteObjectCommand(params);
  await s3Client.send(command);
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

const errorInvalidStatusResponse = (): APIGatewayProxyResult => {
  return {
    statusCode: 403,
    headers,
    body: JSON.stringify({
      message: invalidStatusError
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
    const id = event.pathParameters?.id ?? '';
    if (!(await isActiveAccount(accountId))) {
      return errorInvalidStatusResponse();
    }
    await removeItem(accountId, id);
    return success200Response();
  } catch (err: unknown) {
    console.error({ err });
    return error500Response(err);
  }
};

export { lambdaHandler, invalidStatusError };
