import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { s3Client } from './s3Client';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { dynamoDBClient } from './dynamoDBClient';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

const payloadDoesNotExistError = 'payload does not exist';
const invalidChecksumError = 'invalid checksum';
const invalidStatusError = 'account does not exist or has invalid status.';

const isEnabledAccount = async (accountId: string): Promise<boolean> => {
  const params = {
    TableName: process.env.AccountTableName,
    Key: { v: 1, accountId }
  };
  const command = new GetCommand(params);
  const status = (await dynamoDBClient.send(command))?.Item?.status;
  if (status) {
    return status !== 'disabled';
  }
  return false;
};

const isValidChecksum = (checksum: string): boolean => {
  const checksumPattern = /^[a-f0-9]{64}$/u;
  return checksumPattern.test(checksum);
};

const getPayload = async (accountId: string, checksum: string): Promise<Uint8Array | undefined> => {
  const params = {
    Bucket: process.env.PayloadsBucketName,
    Key: `${accountId}/${checksum}`
  };
  const command = new GetObjectCommand(params);
  try {
    const { Body } = await s3Client.send(command);
    if (!Body) {
      return undefined;
    }
    return Body.transformToByteArray();
  } catch {
    return undefined;
  }
};

const success200Response = (Body: Uint8Array): APIGatewayProxyResult => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/octet-stream'
    },
    body: Buffer.from(Body).toString('base64'),
    isBase64Encoded: true
  };
};

const error4xxResponse = (statusCode: number, errMsg: string): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `some error happened: ${errMsg}`
    }),
    isBase64Encoded: false
  };
};

const error500Response = (err: unknown): APIGatewayProxyResult => {
  const errMsg = err ? (err as Error).message : '';
  return {
    statusCode: 500,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `some error happened: ${errMsg}`
    }),
    isBase64Encoded: false
  };
};

const lambdaHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
  try {
    const accountId: string = event.requestContext.authorizer.jwt.claims.sub as string;
    const checksum = event.pathParameters?.checksum ?? '';
    if (!(await isEnabledAccount(accountId))) {
      return error4xxResponse(403, invalidStatusError);
    }
    if (!isValidChecksum(checksum)) {
      return error4xxResponse(400, invalidChecksumError);
    }
    const Body = await getPayload(accountId, checksum);
    if (!Body) {
      return error4xxResponse(404, payloadDoesNotExistError);
    }
    return success200Response(Body);
  } catch (err: unknown) {
    console.error({ err });
    return error500Response(err);
  }
};

export { lambdaHandler, payloadDoesNotExistError, invalidChecksumError, invalidStatusError };
