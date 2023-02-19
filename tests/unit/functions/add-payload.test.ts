import { lambdaHandler, notAllowedError, invalidChecksumError } from '../../../src/functions/add-payload/app';
import { buildTestEvent, accountId } from '../event';
import { assert } from 'assertthat';
import { s3Client } from '../localRes/s3Client';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

jest.mock('../../../src/functions/add-payload/s3Client', () => {
  const originalModule = jest.requireActual('../localRes/s3Client');
  return {
    ...originalModule
  };
});

const bucketName = 'diamory-s3-bucket';
const testChecksum = 'd1d733a8041744d6e4b7b991b5f38df48a3767acd674c9df231c92068801a460';
const testBody = Buffer.from('testContent', 'utf8');

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

describe('Add Payload', (): void => {
  afterEach(async (): Promise<void> => {
    await deletePayload();
  });

  test('returns with success on active account.', async (): Promise<void> => {
    const event = buildTestEvent(
      'post',
      'payload/{checksum}',
      [testChecksum],
      Buffer.from(testBody).toString('base64'),
      true,
      'active'
    );

    const { body, statusCode } = await lambdaHandler(event);

    const payloadBody = await getPayloadBody();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(201);
    assert.that(message).is.equalTo('ok');
    assert.that(payloadBody).is.equalTo(testBody);
  });

  test('returns with error on invalid checksum.', async (): Promise<void> => {
    const event = buildTestEvent(
      'post',
      'payload/{checksum}',
      ['invalid'],
      Buffer.from(testBody).toString('base64'),
      true,
      'active'
    );

    const { body, statusCode } = await lambdaHandler(event);

    const payloadBody = await getPayloadBody();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${invalidChecksumError}`);
    assert.that(payloadBody).is.null();
  });

  test('returns with error on suspended account.', async (): Promise<void> => {
    const event = buildTestEvent(
      'post',
      'payload/{checksum}',
      [testChecksum],
      Buffer.from(testBody).toString('base64'),
      true,
      'suspended'
    );

    const { body, statusCode } = await lambdaHandler(event);

    const payloadBody = await getPayloadBody();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${notAllowedError}`);
    assert.that(payloadBody).is.null();
  });
});
