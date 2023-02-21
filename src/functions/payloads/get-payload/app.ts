import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { s3Client } from './s3Client';
import { GetObjectCommand } from '@aws-sdk/client-s3';

const payloadDoesNotExistError = 'payload does not exist';
const invalidChecksumError = 'invalid checksum';

const checkChecksum = (checksum: string): void => {
  const checksumPattern = /^[a-f0-9]{64}$/u;
  if (!checksumPattern.test(checksum)) {
    throw new Error(invalidChecksumError);
  }
};

const getPayload = async (accountId: string, checksum: string): Promise<Uint8Array> => {
  const params = {
    Bucket: process.env.PayloadsBucketName,
    Key: `${accountId}/${checksum}`
  };
  const command = new GetObjectCommand(params);
  try {
    const { Body } = await s3Client.send(command);
    if (!Body) {
      throw new Error(payloadDoesNotExistError);
    }
    return Body.transformToByteArray();
  } catch {
    throw new Error(payloadDoesNotExistError);
  }
};

const lambdaHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
  try {
    const accountId: string = event.requestContext.authorizer.jwt.claims.sub as string;
    const checksum = event.pathParameters?.checksum ?? '';
    checkChecksum(checksum);
    const Body = await getPayload(accountId, checksum);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      body: Buffer.from(Body).toString('base64'),
      isBase64Encoded: true
    };
  } catch (err: unknown) {
    console.error({ err });
    const errMsg = err ? (err as Error).message : '';
    return {
      statusCode: errMsg == invalidChecksumError ? 500 : 404,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `some error happened: ${errMsg}`
      }),
      isBase64Encoded: false
    };
  }
};

export { lambdaHandler, payloadDoesNotExistError, invalidChecksumError };
