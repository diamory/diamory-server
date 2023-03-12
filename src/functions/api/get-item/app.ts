import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { s3Client } from './s3Client';
import { GetObjectCommand, GetObjectCommandInput, GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { dynamoDBClient } from './dynamoDBClient';
import { GetCommand, GetCommandInput } from '@aws-sdk/lib-dynamodb';

const payloadDoesNotExistError = 'payload does not exist';
const invalidChecksumError = 'invalid checksum';
const invalidStatusError = 'account does not exist or has invalid status.';

const isEnabledAccount = async (accountId: string): Promise<boolean> => {
  const params: GetCommandInput = {
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

const getObject = async (accountId: string, id: string): Promise<GetObjectCommandOutput | null> => {
  const params: GetObjectCommandInput = {
    Bucket: process.env.PayloadsBucketName,
    Key: `${accountId}/${id}`
  };
  const command = new GetObjectCommand(params);
  try {
    return await s3Client.send(command);
  } catch {
    return null;
  }
};

const isObjectNewOrModified = (s3Object: GetObjectCommandOutput, checksum: string): boolean => {
  const objectChecksum = s3Object.Metadata?.checksum ?? '';
  return objectChecksum !== checksum;
};

const getObjectBody = async (s3Object: GetObjectCommandOutput): Promise<Uint8Array> => {
  return s3Object.Body ? await s3Object.Body.transformToByteArray() : new Uint8Array(0);
};

const success200Response = (Body: Uint8Array, timestamp: string): APIGatewayProxyResult => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Last-Modified-Timestamp': timestamp
    },
    body: Buffer.from(Body).toString('base64'),
    isBase64Encoded: true
  };
};

const success304Response = (): APIGatewayProxyResult => {
  return {
    statusCode: 304,
    body: '',
    isBase64Encoded: false
  };
};

const errorForbiddenResponse = (errMsg: string): APIGatewayProxyResult => {
  return {
    statusCode: 403,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: errMsg
    }),
    isBase64Encoded: false
  };
};

const errorNotFoundResponse = (): APIGatewayProxyResult => {
  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json'
    },
    body: '',
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
      message: errMsg
    }),
    isBase64Encoded: false
  };
};

const lambdaHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
  try {
    const accountId: string = event.requestContext.authorizer.jwt.claims.sub as string;
    const id: string = event.pathParameters?.id ?? '';
    const checksum = event.pathParameters?.checksum ?? '';
    if (!(await isEnabledAccount(accountId))) {
      return errorForbiddenResponse(invalidStatusError);
    }
    const s3Object = await getObject(accountId, id);
    if (!s3Object || !s3Object.Body) {
      return errorNotFoundResponse();
    }
    if (isObjectNewOrModified(s3Object, checksum)) {
      const Body = await getObjectBody(s3Object);
      return success200Response(Body, s3Object.Metadata?.timestamp ?? '-');
    }
    return success304Response();
  } catch (err: unknown) {
    console.error({ err });
    return error500Response(err);
  }
};

export { lambdaHandler, payloadDoesNotExistError, invalidChecksumError, invalidStatusError };
