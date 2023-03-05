import { lambdaHandler, missingItemError, invalidStatusError } from '../../../../src/functions/items/get-item/app';
import { buildTestEvent } from '../../event';
import { assert } from 'assertthat';
import { dynamoDBClient } from '../../localRes/dynamoDBClient';
import { PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { DiamoryItem } from '../../types/item';
import { putAccount, deleteAccount } from '../../helpers/accounts';

jest.mock('../../../../src/functions/items/get-item/dynamoDBClient', () => {
  const originalModule = jest.requireActual('../../localRes/dynamoDBClient');
  return {
    ...originalModule
  };
});

const itemTableName = process.env.ItemTableName;
const accountId = process.env.testAccountId ?? '';

const testItem: DiamoryItem = {
  id: 'id',
  checksum: '73475cb40a568e8da8a045ced110137e159f890ac4da883b6b17dc651b3a8049',
  payloadTimestamp: 42
};

const putItem = async (): Promise<void> => {
  const params = {
    TableName: itemTableName,
    Item: {
      ...testItem,
      accountId
    }
  };
  const command = new PutCommand(params);
  await dynamoDBClient.send(command);
};

const deleteItem = async (): Promise<void> => {
  const { id } = testItem;
  const params = {
    TableName: itemTableName,
    Key: { id, accountId }
  };
  const command = new DeleteCommand(params);
  await dynamoDBClient.send(command);
};

describe('Get Item', (): void => {
  afterEach(async (): Promise<void> => {
    await deleteItem();
    await deleteAccount();
  });

  test('returns item on active account.', async (): Promise<void> => {
    putAccount('active');
    await putItem();
    const { id, checksum, payloadTimestamp } = testItem;
    const event = buildTestEvent('get', '/item/{id}', [id], {}, false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const { message, item } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(200);
    assert.that(message).is.equalTo('ok');
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(item).is.not.undefined();
    assert.that(item).is.not.null();
    assert.that(item.id).is.equalTo(id);
    assert.that(item.checksum).is.equalTo(checksum);
    assert.that(item.payloadTimestamp).is.equalTo(payloadTimestamp);
    assert.that(item.accountId).is.undefined();
  });

  test('returns item on suspended account.', async (): Promise<void> => {
    putAccount('suspended');
    await putItem();
    const { id, checksum, payloadTimestamp } = testItem;
    const event = buildTestEvent('get', '/item/{id}', [id], {}, false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const { message, item } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(200);
    assert.that(message).is.equalTo('ok');
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(item).is.not.undefined();
    assert.that(item).is.not.null();
    assert.that(item.id).is.equalTo(id);
    assert.that(item.checksum).is.equalTo(checksum);
    assert.that(item.payloadTimestamp).is.equalTo(payloadTimestamp);
    assert.that(item.accountId).is.undefined();
  });

  test('returns with error due to missing item.', async (): Promise<void> => {
    putAccount('active');
    await putItem();
    const event = buildTestEvent('get', '/item/{id}', ['missing'], {}, false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const { message, item } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(404);
    assert.that(message).is.equalTo(`some error happened: ${missingItemError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(item).is.null();
  });

  test('returns with error due to disabled account.', async (): Promise<void> => {
    putAccount('disabled');
    await putItem();
    const { id } = testItem;
    const event = buildTestEvent('get', '/item/{id}', [id], {}, false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const { message, item } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(403);
    assert.that(message).is.equalTo(`some error happened: ${invalidStatusError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(item).is.null();
  });

  test('returns with error due to missing account.', async (): Promise<void> => {
    await putItem();
    const { id } = testItem;
    const event = buildTestEvent('get', '/item/{id}', [id], {}, false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const { message, item } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(403);
    assert.that(message).is.equalTo(`some error happened: ${invalidStatusError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(item).is.null();
  });
});
