import {
  lambdaHandler,
  notAllowedError,
  invalidChecksumError
} from '../../../../src/functions/payloads/add-payload/app';
import { buildTestEvent, accountId } from '../../event';
import { assert } from 'assertthat';
import { s3Client } from '../../localRes/s3Client';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { dynamoDBClient } from '../../localRes/dynamoDBClient';
import { PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

jest.mock('../../../../src/functions/payloads/add-payload/s3Client', () => {
  const originalModule = jest.requireActual('../../localRes/s3Client');
  return {
    ...originalModule
  };
});

jest.mock('../../../../src/functions/payloads/add-payload/dynamoDBClient', () => {
  const originalModule = jest.requireActual('../../localRes/dynamoDBClient');
  return {
    ...originalModule
  };
});

const bucketName = process.env.PayloadsBucketName;
const accountTableName = process.env.AccountTableName;
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

const putAccount = async (status: string): Promise<void> => {
  const params = {
    TableName: accountTableName,
    Item: { accountId, status }
  };
  const command = new PutCommand(params);
  await dynamoDBClient.send(command);
};

const deleteAccount = async (): Promise<void> => {
  const params = {
    TableName: accountTableName,
    Key: { accountId }
  };
  const command = new DeleteCommand(params);
  await dynamoDBClient.send(command);
};

describe('Add Payload', (): void => {
  afterEach(async (): Promise<void> => {
    await deletePayload();
    await deleteAccount();
  });

  test('returns with success on active account.', async (): Promise<void> => {
    await putAccount('active');
    const event = buildTestEvent(
      'post',
      'payload/{checksum}',
      [testChecksum],
      Buffer.from(testBody).toString('base64'),
      true
    );

    const { body, statusCode, headers } = await lambdaHandler(event);

    const payloadBody = await getPayloadBody();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(201);
    assert.that(message).is.equalTo('ok');
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(payloadBody).is.equalTo(testBody);
  });

  test('returns with error on invalid checksum.', async (): Promise<void> => {
    await putAccount('active');
    const event = buildTestEvent(
      'post',
      'payload/{checksum}',
      ['invalid'],
      Buffer.from(testBody).toString('base64'),
      true
    );

    const { body, statusCode, headers } = await lambdaHandler(event);

    const payloadBody = await getPayloadBody();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${invalidChecksumError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(payloadBody).is.null();
  });

  test('returns with error on suspended account.', async (): Promise<void> => {
    await putAccount('suspended');
    const event = buildTestEvent(
      'post',
      'payload/{checksum}',
      [testChecksum],
      Buffer.from(testBody).toString('base64'),
      true
    );

    const { body, statusCode, headers } = await lambdaHandler(event);

    const payloadBody = await getPayloadBody();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${notAllowedError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(payloadBody).is.null();
  });

  test('returns with error on missing account.', async (): Promise<void> => {
    const event = buildTestEvent(
      'post',
      'payload/{checksum}',
      [testChecksum],
      Buffer.from(testBody).toString('base64'),
      true
    );

    const { body, statusCode, headers } = await lambdaHandler(event);

    const payloadBody = await getPayloadBody();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${notAllowedError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(payloadBody).is.null();
  });
});
