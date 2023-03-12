import { lambdaHandler, invalidStatusError } from '../../../../src/functions/api/put-item/app';
import { buildTestEvent } from '../../event';
import { assert } from 'assertthat';
import { s3Client } from '../../localRes/s3Client';
import { GetObjectCommand, DeleteObjectCommand, GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { putAccount, deleteAccount } from '../../helpers/accounts';

const fakeDateTime = new Date();

jest.useFakeTimers().setSystemTime(fakeDateTime);

jest.mock('../../../../src/functions/api/put-item/s3Client', () => {
  const originalModule = jest.requireActual('../../localRes/s3Client');
  return {
    ...originalModule
  };
});

jest.mock('../../../../src/functions/api/put-item/dynamoDBClient', () => {
  const originalModule = jest.requireActual('../../localRes/dynamoDBClient');
  return {
    ...originalModule
  };
});

const bucketName = process.env.PayloadsBucketName;
const accountId = process.env.testAccountId ?? '';

const testItem = {
  id: 'testItem',
  checksum: '0dczqAQXRNbkt7mRtfON9Io3Z6zWdMnfIxySBogBpGA=',
  Body: Buffer.from('testContent', 'utf8')
};

const getItem = async (): Promise<GetObjectCommandOutput | null> => {
  const params = {
    Bucket: bucketName,
    Key: `${accountId}/${testItem.id}`
  };
  const command = new GetObjectCommand(params);
  try {
    return await s3Client.send(command);
  } catch {
    return null;
  }
};

const deleteItem = async (): Promise<void> => {
  const params = {
    Bucket: bucketName,
    Key: `${accountId}/${testItem.id}`
  };
  const command = new DeleteObjectCommand(params);
  await s3Client.send(command);
};

describe('Put Item', (): void => {
  afterEach(async (): Promise<void> => {
    await deleteItem();
    await deleteAccount();
  });

  test('returns with success on active account when item is put.', async (): Promise<void> => {
    const { id, checksum, Body } = testItem;
    await putAccount('active');
    const event = buildTestEvent(
      'put',
      'put-item/{id}/{checksum}',
      [id, checksum],
      Buffer.from(testItem.Body).toString('base64'),
      true
    );

    const { body, statusCode, headers } = await lambdaHandler(event);

    const item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(200);
    assert.that(message).is.equalTo('ok');
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(item).is.not.null();
    assert.that(item?.Metadata?.checksum).is.equalTo(checksum);
    assert.that(item?.Metadata?.timestamp).is.equalTo(fakeDateTime.getTime().toString());
    assert.that(await item?.Body?.transformToByteArray()).is.equalTo(Body);
  });

  test('returns with error on suspended account.', async (): Promise<void> => {
    const { id, checksum } = testItem;
    await putAccount('suspended');
    const event = buildTestEvent(
      'put',
      'put-item/{id}/{checksum}',
      [id, checksum],
      Buffer.from(testItem.Body).toString('base64'),
      true
    );

    const { body, statusCode, headers } = await lambdaHandler(event);

    const item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(403);
    assert.that(message).is.equalTo(invalidStatusError);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(item).is.null();
  });

  test('returns with error on missing account.', async (): Promise<void> => {
    const { id, checksum } = testItem;
    const event = buildTestEvent(
      'put',
      'put-item/{id}/{checksum}',
      [id, checksum],
      Buffer.from(testItem.Body).toString('base64'),
      true
    );

    const { body, statusCode, headers } = await lambdaHandler(event);

    const item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(403);
    assert.that(message).is.equalTo(invalidStatusError);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(item).is.null();
  });
});
