import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { s3Client } from './s3Client';
import { dynamoDBClient } from './dynamoDBClient';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

const notAllowedError = 'you are not allowed to do so';
const invalidChecksumError = 'invalid checksum';

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

const checkChecksum = (checksum: string): void => {
  const checksumPattern = /^[a-f0-9]{64}$/u;
  if (!checksumPattern.test(checksum)) {
    throw new Error(invalidChecksumError);
  }
};

const addPayload = async (accountId: string, checksum: string, Body: Buffer): Promise<void> => {
  const params = {
    Bucket: 'diamory-s3-bucket',
    Key: `${accountId}/${checksum}`,
    Body
  };
  const command = new PutObjectCommand(params);
  await s3Client.send(command);
};

const lambdaHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
  try {
    const accountId: string = event.requestContext.authorizer.jwt.claims.sub as string;
    await checkAccount(accountId);
    const checksum = event.pathParameters?.checksum ?? '';
    checkChecksum(checksum);
    const body = Buffer.from(event.body ?? '', 'base64');
    await addPayload(accountId, checksum, body);
    return {
      statusCode: 201,
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

export { lambdaHandler, notAllowedError, invalidChecksumError };