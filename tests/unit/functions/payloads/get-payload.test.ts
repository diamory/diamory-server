import {
  lambdaHandler,
  payloadDoesNotExistError,
  invalidChecksumError
} from '../../../../src/functions/payloads/get-payload/app';
import { buildTestEvent, accountId } from '../../event';
import { assert } from 'assertthat';
import { s3Client } from '../../localRes/s3Client';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

jest.mock('../../../../src/functions/payloads/get-payload/s3Client', () => {
  const originalModule = jest.requireActual('../../localRes/s3Client');
  return {
    ...originalModule
  };
});

const bucketName = process.env.PayloadsBucketName;
const testChecksum = 'd1d733a8041744d6e4b7b991b5f38df48a3767acd674c9df231c92068801a460';
const testBody = Buffer.from('testContent', 'utf8');

const putPayload = async (): Promise<void> => {
  const params = {
    Bucket: bucketName,
    Key: `${accountId}/${testChecksum}`,
    Body: testBody
  };
  const command = new PutObjectCommand(params);
  await s3Client.send(command);
};

const deletePayload = async (): Promise<void> => {
  const params = {
    Bucket: bucketName,
    Key: `${accountId}/${testChecksum}`
  };
  const command = new DeleteObjectCommand(params);
  await s3Client.send(command);
};

describe('Get Payload', (): void => {
  beforeEach(async (): Promise<void> => {
    await putPayload();
  });

  afterEach(async (): Promise<void> => {
    await deletePayload();
  });

  test('returns with success and correct item.', async (): Promise<void> => {
    const event = buildTestEvent('get', 'payload/{checksum}', [testChecksum], {}, false);

    const { body, isBase64Encoded, statusCode, headers } = await lambdaHandler(event);

    assert.that(statusCode).is.equalTo(200);
    assert.that(body).is.equalTo(Buffer.from(testBody).toString('base64'));
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/octet-stream');
    assert.that(isBase64Encoded).is.true();
  });

  test('returns with error on invalid checksum.', async (): Promise<void> => {
    const event = buildTestEvent('get', 'payload/{checksum}', ['invalid'], {}, false);

    const { body, isBase64Encoded, statusCode, headers } = await lambdaHandler(event);

    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(isBase64Encoded).is.false();
    assert.that(message).is.equalTo(`some error happened: ${invalidChecksumError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
  });

  test('returns empty buffer if object does not exist.', async (): Promise<void> => {
    const event = buildTestEvent('get', 'payload/{checksum}', [testChecksum.replace('d', 'e')], {}, false);

    const { body, isBase64Encoded, statusCode, headers } = await lambdaHandler(event);

    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(404);
    assert.that(isBase64Encoded).is.false();
    assert.that(message).is.equalTo(`some error happened: ${payloadDoesNotExistError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
  });
});
