import {
  lambdaHandler,
  missingItemError,
  invalidItemError,
  invalidStatusError
} from '../../../../src/functions/items/update-item/app';
import { buildTestEvent } from '../../event';
import { AnyItem } from '../../types/generics';
import { assert } from 'assertthat';
import { dynamoDBClient } from '../../localRes/dynamoDBClient';
import { PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { DiamoryItem } from '../../../../src/functions/items/update-item/item';
import { putAccount, deleteAccount } from '../../helpers/accounts';

jest.mock('../../../../src/functions/items/update-item/dynamoDBClient', () => {
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

const modifiedItem: DiamoryItem = {
  id: 'id',
  checksum: 'a17317b40a568e8da8a045ced110137e159f890ac4da883b6b17dc651ba17317',
  payloadTimestamp: 96
};

const getItem = async (): Promise<AnyItem | undefined> => {
  const { id } = testItem;
  const params = {
    TableName: itemTableName,
    Key: { id, accountId }
  };
  const command = new GetCommand(params);
  const response = await dynamoDBClient.send(command);
  return response.Item;
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

describe('Update Item', (): void => {
  afterEach(async (): Promise<void> => {
    await deleteItem();
    await deleteAccount();
  });

  test('returns with success when existing item is modified.', async (): Promise<void> => {
    await putAccount('active');
    await putItem();
    const { id, checksum, payloadTimestamp } = modifiedItem;
    const event = buildTestEvent('put', '/item', [], modifiedItem, false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const Item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(200);
    assert.that(message).is.equalTo('ok');
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(Item).is.not.undefined();
    assert.that(Item).is.not.null();
    assert.that(Item?.id).is.equalTo(id);
    assert.that(Item?.checksum).is.equalTo(checksum);
    assert.that(Item?.payloadTimestamp).is.equalTo(payloadTimestamp);
    assert.that(Item?.accountId).is.equalTo(accountId);
  });

  test('returns with error due to missing item.', async (): Promise<void> => {
    await putAccount('active');
    const event = buildTestEvent('put', '/item', [], modifiedItem, false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const Item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(404);
    assert.that(message).is.equalTo(`some error happened: ${missingItemError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(Item).is.undefined();
  });

  test('returns with error on invalid item.', async (): Promise<void> => {
    await putAccount('active');
    await putItem();
    const { id, checksum, payloadTimestamp } = testItem;
    const event = buildTestEvent('put', '/item', [], {}, false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const Item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(400);
    assert.that(message).is.equalTo(`some error happened: ${invalidItemError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(Item).is.not.undefined();
    assert.that(Item).is.not.null();
    assert.that(Item?.id).is.equalTo(id);
    assert.that(Item?.checksum).is.equalTo(checksum);
    assert.that(Item?.payloadTimestamp).is.equalTo(payloadTimestamp);
    assert.that(Item?.accountId).is.equalTo(accountId);
  });

  test('returns with error on suspended account.', async (): Promise<void> => {
    await putAccount('suspended');
    await putItem();
    const { id, checksum, payloadTimestamp } = testItem;
    const event = buildTestEvent('put', '/item', [], modifiedItem, false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const Item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(403);
    assert.that(message).is.equalTo(`some error happened: ${invalidStatusError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(Item).is.not.undefined();
    assert.that(Item).is.not.null();
    assert.that(Item?.id).is.equalTo(id);
    assert.that(Item?.checksum).is.equalTo(checksum);
    assert.that(Item?.payloadTimestamp).is.equalTo(payloadTimestamp);
    assert.that(Item?.accountId).is.equalTo(accountId);
  });

  test('returns with error on missing account.', async (): Promise<void> => {
    await putItem();
    const { id, checksum, payloadTimestamp } = testItem;
    const event = buildTestEvent('put', '/item', [], modifiedItem, false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const Item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(403);
    assert.that(message).is.equalTo(`some error happened: ${invalidStatusError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(Item).is.not.undefined();
    assert.that(Item).is.not.null();
    assert.that(Item?.id).is.equalTo(id);
    assert.that(Item?.checksum).is.equalTo(checksum);
    assert.that(Item?.payloadTimestamp).is.equalTo(payloadTimestamp);
    assert.that(Item?.accountId).is.equalTo(accountId);
  });
});
