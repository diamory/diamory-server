import {
  lambdaHandler,
  notAllowedError,
  invalidOldChecksumError,
  invalidNewChecksumError
} from '../../../../src/functions/payloads/replace-payload/app';
import { buildTestEvent, accountId } from '../../event';
import { assert } from 'assertthat';
import { s3Client } from '../../localRes/s3Client';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

jest.mock('../../../../src/functions/payloads/replace-payload/s3Client', () => {
  const originalModule = jest.requireActual('../../localRes/s3Client');
  return {
    ...originalModule
  };
});

const bucketName = 'diamory-s3-bucket';
const testChecksum = 'd1d733a8041744d6e4b7b991b5f38df48a3767acd674c9df231c92068801a460';
const testBody = Buffer.from('testContent', 'utf8');
const newTestChecksum = '2c6c86190554227524a49df554d8a1ad1a87200d277445b0b4d68455ac629a6b';
const newTestBody = Buffer.from('newTestContent', 'utf8');

const putPayload = async (): Promise<void> => {
  const params = {
    Bucket: bucketName,
    Key: `${accountId}/${testChecksum}`,
    Body: testBody
  };
  const command = new PutObjectCommand(params);
  await s3Client.send(command);
};

const getPayloadBody = async (checksum: string): Promise<Uint8Array | null> => {
  const params = {
    Bucket: bucketName,
    Key: `${accountId}/${checksum}`
  };
  const command = new GetObjectCommand(params);
  try {
    const { Body } = await s3Client.send(command);
    return Body?.transformToByteArray() ?? null;
  } catch {
    return null;
  }
};

const deletePayloads = async (): Promise<void> => {
  const params = {
    Bucket: bucketName,
    Key: `${accountId}/${testChecksum}`
  };
  const params2 = {
    Bucket: bucketName,
    Key: `${accountId}/${newTestChecksum}`
  };
  const command = new DeleteObjectCommand(params);
  const command2 = new DeleteObjectCommand(params2);
  await s3Client.send(command);
  await s3Client.send(command2);
};

describe('Replace Payload', (): void => {
  beforeEach(async (): Promise<void> => {
    await putPayload();
  });

  afterEach(async (): Promise<void> => {
    await deletePayloads();
  });

  test('returns with success on active account when updated.', async (): Promise<void> => {
    const event = buildTestEvent(
      'put',
      'payload/{oldChecksum}/{newChecksum}',
      [testChecksum, newTestChecksum],
      Buffer.from(newTestBody).toString('base64'),
      true,
      'active'
    );

    const { body, statusCode, headers } = await lambdaHandler(event);

    const oldPayloadBody = await getPayloadBody(testChecksum);
    const newPayloadBody = await getPayloadBody(newTestChecksum);
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(200);
    assert.that(message).is.equalTo('ok');
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(oldPayloadBody).is.null();
    assert.that(newPayloadBody).is.equalTo(newTestBody);
  });

  test('returns with error on invalid old checksum.', async (): Promise<void> => {
    const event = buildTestEvent(
      'put',
      'payload/{oldChecksum}/{newChecksum}',
      ['invalid', newTestChecksum],
      Buffer.from(newTestBody).toString('base64'),
      true,
      'active'
    );

    const { body, statusCode, headers } = await lambdaHandler(event);

    const oldPayloadBody = await getPayloadBody(testChecksum);
    const newPayloadBody = await getPayloadBody(newTestChecksum);
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${invalidOldChecksumError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(oldPayloadBody).is.equalTo(testBody);
    assert.that(newPayloadBody).is.null();
  });

  test('returns with error on invalid new checksum.', async (): Promise<void> => {
    const event = buildTestEvent(
      'put',
      'payload/{oldChecksum}/{newChecksum}',
      [testChecksum, 'invalid'],
      Buffer.from(newTestBody).toString('base64'),
      true,
      'active'
    );

    const { body, statusCode, headers } = await lambdaHandler(event);

    const oldPayloadBody = await getPayloadBody(testChecksum);
    const newPayloadBody = await getPayloadBody(newTestChecksum);
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${invalidNewChecksumError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(oldPayloadBody).is.equalTo(testBody);
    assert.that(newPayloadBody).is.null();
  });

  test('returns with error on suspended account.', async (): Promise<void> => {
    const event = buildTestEvent(
      'put',
      'payload/{oldChecksum}/{newChecksum}',
      [testChecksum, newTestChecksum],
      Buffer.from(newTestBody).toString('base64'),
      true,
      'suspended'
    );

    const { body, statusCode, headers } = await lambdaHandler(event);

    const oldPayloadBody = await getPayloadBody(testChecksum);
    const newPayloadBody = await getPayloadBody(newTestChecksum);
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${notAllowedError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(oldPayloadBody).is.equalTo(testBody);
    assert.that(newPayloadBody).is.null();
  });
});
