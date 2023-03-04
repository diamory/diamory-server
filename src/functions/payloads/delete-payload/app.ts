import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { s3Client } from './s3Client';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { dynamoDBClient } from './dynamoDBClient';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

const notAllowedError = 'you are not allowed to do so';
const invalidChecksumError = 'invalid checksum';

const headers = {
  'Content-Type': 'application/json'
};

const isActiveAccount = async (accountId: string): Promise<boolean> => {
  const params = {
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

const isValidChecksum = (checksum: string): boolean => {
  const checksumPattern = /^[a-f0-9]{64}$/u;
  return checksumPattern.test(checksum);
};

const deletePayload = async (accountId: string, checksum: string): Promise<void> => {
  const params = {
    Bucket: process.env.PayloadsBucketName,
    Key: `${accountId}/${checksum}`
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
    const checksum = event.pathParameters?.checksum ?? '';
    if (!(await isActiveAccount(accountId))) {
      return error4xxResponse(403, notAllowedError);
    }
    if (!isValidChecksum(checksum)) {
      return error4xxResponse(400, invalidChecksumError);
    }
    await deletePayload(accountId, checksum);
    return success200Response();
  } catch (err: unknown) {
    console.error({ err });
    return error500Response(err);
  }
};

export { lambdaHandler, notAllowedError, invalidChecksumError };
