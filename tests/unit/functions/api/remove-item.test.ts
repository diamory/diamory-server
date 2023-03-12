import { lambdaHandler, invalidStatusError } from '../../../../src/functions/api/remove-item/app';
import { buildTestEvent } from '../../event';
import { assert } from 'assertthat';
import { s3Client } from '../../localRes/s3Client';
import { GetObjectCommand, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { putAccount, deleteAccount } from '../../helpers/accounts';

jest.mock('../../../../src/functions/api/remove-item/s3Client', () => {
  const originalModule = jest.requireActual('../../localRes/s3Client');
  return {
    ...originalModule
  };
});

jest.mock('../../../../src/functions/api/remove-item/dynamoDBClient', () => {
  const originalModule = jest.requireActual('../../localRes/dynamoDBClient');
  return {
    ...originalModule
  };
});

const bucketName = process.env.PayloadsBucketName;
const accountId = process.env.testAccountId ?? '';
const testId = 'testItem';

const putItem = async (): Promise<void> => {
  const params = {
    Bucket: bucketName,
    Key: `${accountId}/${testId}`,
    Body: ''
  };
  const command = new PutObjectCommand(params);
  await s3Client.send(command);
};

const isItemThere = async (): Promise<boolean> => {
  const params = {
    Bucket: bucketName,
    Key: `${accountId}/${testId}`
  };
  const command = new GetObjectCommand(params);
  try {
    const { Body } = await s3Client.send(command);
    return !!Body;
  } catch {
    return false;
  }
};

const deleteItem = async (): Promise<void> => {
  const params = {
    Bucket: bucketName,
    Key: `${accountId}/${testId}`
  };
  const command = new DeleteObjectCommand(params);
  await s3Client.send(command);
};

describe('Remove Item', (): void => {
  beforeEach(async (): Promise<void> => {
    await putItem();
  });

  afterEach(async (): Promise<void> => {
    await deleteItem();
    await deleteAccount();
  });

  test('returns with success on active account when item is removed.', async (): Promise<void> => {
    await putAccount('active');
    const event = buildTestEvent('delete', 'remove-item/{id}', [testId], {}, false);

    const { body, statusCode, headers } = await lambdaHandler(event);

    const itemExists = await isItemThere();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(200);
    assert.that(message).is.equalTo('ok');
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(itemExists).is.false();
  });

  test('returns with error on suspended account.', async (): Promise<void> => {
    await putAccount('suspended');
    const event = buildTestEvent('delete', 'remove-item/{id}', [testId], {}, false);

    const { body, statusCode, headers } = await lambdaHandler(event);

    const itemExists = await isItemThere();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(403);
    assert.that(message).is.equalTo(invalidStatusError);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(itemExists).is.true();
  });

  test('returns with error on missing account.', async (): Promise<void> => {
    const event = buildTestEvent('delete', 'remove-item/{id}', [testId], {}, false);

    const { body, statusCode, headers } = await lambdaHandler(event);

    const itemExists = await isItemThere();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(403);
    assert.that(message).is.equalTo(invalidStatusError);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(itemExists).is.true();
  });
});
