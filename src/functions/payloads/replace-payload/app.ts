import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { s3Client } from './s3Client';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const notAllowedError = 'you are not allowed to do so';
const invalidOldChecksumError = 'invalid old checksum';
const invalidNewChecksumError = 'invalid new checksum';

const checkAccountStatus = (status: string, requiredStatus: string): void => {
  if (status !== requiredStatus) {
    throw new Error(notAllowedError);
  }
};

const checkChecksum = (checksum: string, errMsg: string): void => {
  const checksumPattern = /^[a-f0-9]{64}$/u;
  if (!checksumPattern.test(checksum)) {
    throw new Error(errMsg);
  }
};

const deletePayload = async (accountId: string, checksum: string): Promise<void> => {
  const params = {
    Bucket: 'diamory-s3-bucket',
    Key: `${accountId}/${checksum}`
  };
  const command = new DeleteObjectCommand(params);
  await s3Client.send(command);
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
    const status: string = event.requestContext.authorizer.jwt.claims.status as string;
    checkAccountStatus(status, 'active');
    const oldChecksum = event.pathParameters?.oldChecksum ?? '';
    const newChecksum = event.pathParameters?.newChecksum ?? '';
    checkChecksum(oldChecksum, invalidOldChecksumError);
    checkChecksum(newChecksum, invalidNewChecksumError);
    const body = Buffer.from(event.body ?? '', 'base64');
    await deletePayload(accountId, oldChecksum);
    await addPayload(accountId, newChecksum, body);
    return {
      statusCode: 200,
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

export { lambdaHandler, notAllowedError, invalidOldChecksumError, invalidNewChecksumError };
