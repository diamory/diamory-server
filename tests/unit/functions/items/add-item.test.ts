import {
  lambdaHandler,
  invalidStatusError,
  invalidItemError,
  itemAlreadyExistsError
} from '../../../../src/functions/items/add-item/app';
import { buildTestEvent } from '../../event';
import { assert } from 'assertthat';
import { dynamoDBClient } from '../../localRes/dynamoDBClient';
import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { DiamoryItem, DiamoryItemWithAccountId } from '../../../../src/functions/items/add-item/item';
import { AnyItem } from '../../types/generics';
import { putAccount, deleteAccount } from '../../helpers/accounts';

jest.mock('../../../../src/functions/items/add-item/dynamoDBClient', () => {
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

const deleteItem = async (): Promise<void> => {
  const { id } = testItem;
  const params = {
    TableName: itemTableName,
    Key: { id, accountId }
  };
  const command = new DeleteCommand(params);
  await dynamoDBClient.send(command);
};

describe('Add Item', (): void => {
  afterEach(async (): Promise<void> => {
    await deleteItem();
    await deleteAccount();
  });

  test('returns with success on active account when item is new.', async (): Promise<void> => {
    await putAccount('active');
    const event = buildTestEvent('post', '/item', [], testItem, false);
    const { id, checksum, payloadTimestamp } = testItem;

    const { statusCode, body, headers } = await lambdaHandler(event);

    const Item = (await getItem()) as unknown as DiamoryItemWithAccountId;
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(201);
    assert.that(message).is.equalTo('ok');
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(Item).is.not.undefined();
    assert.that(Item).is.not.null();
    assert.that(Item.id).is.equalTo(id);
    assert.that(Item.checksum).is.equalTo(checksum);
    assert.that(Item.payloadTimestamp).is.equalTo(payloadTimestamp);
    assert.that(Item.accountId).is.equalTo(accountId);
  });

  test('returns with error when item already exists.', async (): Promise<void> => {
    await putAccount('active');
    const addEvent = buildTestEvent('post', '/item', [], testItem, false);
    await lambdaHandler(addEvent);
    const modifiedItem = { ...testItem, payloadTimestamp: 96 };
    const updateEvent = buildTestEvent('post', '/add-item', [], modifiedItem, false);

    const { statusCode, body, headers } = await lambdaHandler(updateEvent);

    const Item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(400);
    assert.that(message).is.equalTo(`some error happened: ${itemAlreadyExistsError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(Item?.payloadTimestamp).is.equalTo(testItem.payloadTimestamp);
  });

  test('returns with error on invalid item.', async (): Promise<void> => {
    await putAccount('active');
    const event = buildTestEvent('post', '/item', [], {}, false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const Item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(400);
    assert.that(message).is.equalTo(`some error happened: ${invalidItemError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(Item).is.undefined();
  });

  test('returns with error on suspended account.', async (): Promise<void> => {
    await putAccount('suspended');
    const event = buildTestEvent('post', '/item', [], testItem, false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const Item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(403);
    assert.that(message).is.equalTo(`some error happened: ${invalidStatusError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(Item).is.undefined();
  });

  test('returns with error on missing account.', async (): Promise<void> => {
    const event = buildTestEvent('post', '/item', [], testItem, false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const Item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(403);
    assert.that(message).is.equalTo(`some error happened: ${invalidStatusError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(Item).is.undefined();
  });
});
