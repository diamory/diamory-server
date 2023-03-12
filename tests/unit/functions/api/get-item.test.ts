import { lambdaHandler, invalidStatusError } from '../../../../src/functions/api/get-item/app';
import { buildTestEvent } from '../../event';
import { assert } from 'assertthat';
import { s3Client } from '../../localRes/s3Client';
import { DeleteObjectCommand, PutObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { putAccount, deleteAccount } from '../../helpers/accounts';

const fakeDateTime = new Date();

jest.useFakeTimers().setSystemTime(fakeDateTime);

jest.mock('../../../../src/functions/api/get-item/s3Client', () => {
  const originalModule = jest.requireActual('../../localRes/s3Client');
  return {
    ...originalModule
  };
});

jest.mock('../../../../src/functions/api/get-item/dynamoDBClient', () => {
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

const putItem = async (): Promise<void> => {
  const { id, checksum, Body } = testItem;
  const params: PutObjectCommandInput = {
    Bucket: bucketName,
    Key: `${accountId}/${id}`,
    Body,
    Metadata: { checksum, timestamp: fakeDateTime.getTime().toString() }
  };
  const command = new PutObjectCommand(params);
  await s3Client.send(command);
};

const deleteItem = async (): Promise<void> => {
  const params = {
    Bucket: bucketName,
    Key: `${accountId}/${testItem.id}`
  };
  const command = new DeleteObjectCommand(params);
  await s3Client.send(command);
};

describe('Get Item', (): void => {
  beforeEach(async (): Promise<void> => {
    await putItem();
  });

  afterEach(async (): Promise<void> => {
    await deleteItem();
    await deleteAccount();
  });

  test('returns with success and correct item on active account, for new.', async (): Promise<void> => {
    await putAccount('active');
    await putItem();
    const { id, Body } = testItem;
    const event = buildTestEvent('get', 'get-item/{id}', [id], {}, false);

    const { body, isBase64Encoded, statusCode, headers } = await lambdaHandler(event);

    assert.that(statusCode).is.equalTo(200);
    assert.that(body).is.equalTo(Buffer.from(Body).toString('base64'));
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/octet-stream');
    assert.that(headers ? headers['Last-Modified-Timestamp'] : '0').is.equalTo(fakeDateTime.getTime().toString());
    assert.that(isBase64Encoded).is.true();
  });

  test('returns with success and correct item on suspended account, for new.', async (): Promise<void> => {
    await putAccount('suspended');
    await putItem();
    const { id, Body } = testItem;
    const event = buildTestEvent('get', 'get-item/{id}', [id], {}, false);

    const { body, isBase64Encoded, statusCode, headers } = await lambdaHandler(event);

    assert.that(statusCode).is.equalTo(200);
    assert.that(body).is.equalTo(Buffer.from(Body).toString('base64'));
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/octet-stream');
    assert.that(headers ? headers['Last-Modified-Timestamp'] : '0').is.equalTo(fakeDateTime.getTime().toString());
    assert.that(isBase64Encoded).is.true();
  });

  test('returns with success and correct item on active account, for modified.', async (): Promise<void> => {
    await putAccount('active');
    await putItem();
    const { id, checksum, Body } = testItem;
    const event = buildTestEvent('get', 'get-item/{id}/{checksum}', [id, checksum.replace('d', 'e')], {}, false);

    const { body, isBase64Encoded, statusCode, headers } = await lambdaHandler(event);

    assert.that(statusCode).is.equalTo(200);
    assert.that(body).is.equalTo(Buffer.from(Body).toString('base64'));
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/octet-stream');
    assert.that(headers ? headers['Last-Modified-Timestamp'] : '0').is.equalTo(fakeDateTime.getTime().toString());
    assert.that(isBase64Encoded).is.true();
  });

  test('returns with success and correct item on suspended account, for modified.', async (): Promise<void> => {
    await putAccount('suspended');
    await putItem();
    const { id, checksum, Body } = testItem;
    const event = buildTestEvent('get', 'get-item/{id}/{checksum}', [id, checksum.replace('d', 'e')], {}, false);

    const { body, isBase64Encoded, statusCode, headers } = await lambdaHandler(event);

    assert.that(statusCode).is.equalTo(200);
    assert.that(body).is.equalTo(Buffer.from(Body).toString('base64'));
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/octet-stream');
    assert.that(headers ? headers['Last-Modified-Timestamp'] : '0').is.equalTo(fakeDateTime.getTime().toString());
    assert.that(isBase64Encoded).is.true();
  });

  test('returns with success and -not-modified--response on active account, for unchanged.', async (): Promise<void> => {
    await putAccount('active');
    await putItem();
    const { id, checksum } = testItem;
    const event = buildTestEvent('get', 'get-item/{id}/{checksum}', [id, checksum], {}, false);

    const { body, isBase64Encoded, statusCode } = await lambdaHandler(event);

    assert.that(statusCode).is.equalTo(304);
    assert.that(body).is.empty();
    assert.that(isBase64Encoded).is.false();
  });

  test('returns with success and -not-modified--response on suspended account, for unchanged.', async (): Promise<void> => {
    await putAccount('suspended');
    await putItem();
    const { id, checksum } = testItem;
    const event = buildTestEvent('get', 'get-item/{id}/{checksum}', [id, checksum], {}, false);

    const { body, isBase64Encoded, statusCode } = await lambdaHandler(event);

    assert.that(statusCode).is.equalTo(304);
    assert.that(body).is.empty();
    assert.that(isBase64Encoded).is.false();
  });

  test('returns with error on disabled account.', async (): Promise<void> => {
    await putAccount('disabled');
    await putItem();
    const { id, checksum } = testItem;
    const event = buildTestEvent('get', 'get-item/{id}/{checksum}', [id, checksum], {}, false);

    const { body, isBase64Encoded, statusCode, headers } = await lambdaHandler(event);

    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(403);
    assert.that(isBase64Encoded).is.false();
    assert.that(message).is.equalTo(invalidStatusError);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
  });

  test('returns with error on missing account.', async (): Promise<void> => {
    await putItem();
    const { id, checksum } = testItem;
    const event = buildTestEvent('get', 'get-item/{id}/{checksum}', [id, checksum], {}, false);

    const { body, isBase64Encoded, statusCode, headers } = await lambdaHandler(event);

    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(403);
    assert.that(isBase64Encoded).is.false();
    assert.that(message).is.equalTo(invalidStatusError);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
  });

  test('returns 404 if object does not exist.', async (): Promise<void> => {
    await putAccount('active');
    const event = buildTestEvent('get', 'get-item/{id}', ['missinng'], {}, false);

    const { body, isBase64Encoded, statusCode } = await lambdaHandler(event);

    assert.that(statusCode).is.equalTo(404);
    assert.that(isBase64Encoded).is.false();
    assert.that(body).is.empty();
  });
});
