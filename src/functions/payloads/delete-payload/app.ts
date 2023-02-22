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

const checkChecksum = (checksum: string): void => {
  const checksumPattern = /^[a-f0-9]{64}$/u;
  if (!checksumPattern.test(checksum)) {
    throw new Error(invalidChecksumError);
  }
};

const deletePayload = async (accountId: string, checksum: string): Promise<void> => {
  const params = {
    Bucket: process.env.PayloadsBucketName,
    Key: `${accountId}/${checksum}`
  };
  const command = new DeleteObjectCommand(params);
  await s3Client.send(command);
};

const lambdaHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
  try {
    const accountId: string = event.requestContext.authorizer.jwt.claims.sub as string;
    await checkAccountStatus(accountId);
    const checksum = event.pathParameters?.checksum ?? '';
    checkChecksum(checksum);
    await deletePayload(accountId, checksum);
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

export { lambdaHandler, notAllowedError, invalidChecksumError };
