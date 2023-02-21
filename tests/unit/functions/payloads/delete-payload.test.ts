import {
  lambdaHandler,
  notAllowedError,
  invalidChecksumError
} from '../../../../src/functions/payloads/delete-payload/app';
import { buildTestEvent, accountId } from '../../event';
import { assert } from 'assertthat';
import { s3Client } from '../../localRes/s3Client';
import { GetObjectCommand, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

jest.mock('../../../../src/functions/payloads/delete-payload/s3Client', () => {
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

const getPayloadBody = async (): Promise<Uint8Array | null> => {
  const params = {
    Bucket: bucketName,
    Key: `${accountId}/${testChecksum}`
  };
  const command = new GetObjectCommand(params);
  try {
    const { Body } = await s3Client.send(command);
    return Body?.transformToByteArray() ?? null;
  } catch {
    return null;
  }
};

const deletePayload = async (): Promise<void> => {
  const params = {
    Bucket: bucketName,
    Key: `${accountId}/${testChecksum}`
  };
  const command = new DeleteObjectCommand(params);
  await s3Client.send(command);
};

describe('Delete Payload', (): void => {
  beforeEach(async (): Promise<void> => {
    await putPayload();
  });

  afterEach(async (): Promise<void> => {
    await deletePayload();
  });

  test('returns with success on active account.', async (): Promise<void> => {
    const event = buildTestEvent('delete', 'payload/{checksum}', [testChecksum], {}, false, 'active');

    const { body, statusCode, headers } = await lambdaHandler(event);

    const payloadBody = await getPayloadBody();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(200);
    assert.that(message).is.equalTo('ok');
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(payloadBody).is.null();
  });

  test('returns with error on invalid checksum.', async (): Promise<void> => {
    const event = buildTestEvent('delete', 'payload/{checksum}', ['invalid'], {}, false, 'active');

    const { body, statusCode, headers } = await lambdaHandler(event);

    const payloadBody = await getPayloadBody();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${invalidChecksumError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(payloadBody).is.equalTo(testBody);
  });

  test('returns with error on suspended account.', async (): Promise<void> => {
    const event = buildTestEvent('delete', 'payload/{checksum}', [testChecksum], {}, false, 'suspended');

    const { body, statusCode, headers } = await lambdaHandler(event);

    const payloadBody = await getPayloadBody();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${notAllowedError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(payloadBody).is.equalTo(testBody);
  });
});
