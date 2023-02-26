import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { s3Client } from './s3Client';
import { getUser } from './cognitoClient';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

const notAllowedError = 'you are not allowed to do so';
const invalidChecksumError = 'invalid checksum';

const headers = {
  'Content-Type': 'application/json'
};

const checkAccountStatus = async (AccessToken: string): Promise<void> => {
  const params = {
    AccessToken
  };
  const user = await getUser(params);
  if (user?.UserAttributes?.find((e) => e.Name === 'dev:custom:status')?.Value !== 'active') {
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
    const token = event.headers.authorization ?? '';
    await checkAccountStatus(token);
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
