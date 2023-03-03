import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { s3Client } from './s3Client';
import { getUser } from './cognitoClient';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

const notAllowedError = 'you are not allowed to do so';
const invalidChecksumError = 'invalid checksum';

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
    const token = event.headers.authorization ?? '';
    const checksum = event.pathParameters?.checksum ?? '';
    if (!(await isActiveAccount(token))) {
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
