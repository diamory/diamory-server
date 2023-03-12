import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { s3Client } from './s3Client';
import { PutObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
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

const putItem = async (accountId: string, id: string, checksum: string, Body: Buffer): Promise<boolean> => {
  const timestamp = Date.now().toString();
  const params: PutObjectCommandInput = {
    Bucket: process.env.PayloadsBucketName,
    Key: `${accountId}/${id}`,
    Body,
    Metadata: { checksum, timestamp: timestamp }
  };
  const command = new PutObjectCommand(params);
  try {
    await s3Client.send(command);
    return true;
  } catch (err: unknown) {
    const errName = (err as Error).name;
    if (errName === 'XAmzContentChecksumMismatch') {
      return false;
    }
    throw err;
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
      message: errMsg
    })
  };
};

const lambdaHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
  try {
    const accountId: string = event.requestContext.authorizer.jwt.claims.sub as string;
    const id = event.pathParameters?.id ?? '';
    const checksum = event.pathParameters?.checksum ?? '';
    if (!(await isActiveAccount(accountId))) {
      return errorInvalidStatusResponse();
    }
    const body = Buffer.from(event.body ?? '', 'base64');
    await putItem(accountId, id, checksum, body);
    return success200Response();
  } catch (err: unknown) {
    console.error({ err });
    return error500Response(err);
  }
};

export { lambdaHandler, invalidStatusError };
