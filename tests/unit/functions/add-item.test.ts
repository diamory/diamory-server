import {
  lambdaHandler,
  notAllowedError,
  invalidItemError,
  itemAlreadyExistsError
} from '../../../src/functions/add-item/app';
import { buildTestEvent, accountId } from '../event';
import { accountTableName, itemTableName } from '../constants';
import { assert } from 'assertthat';
import { dynamoDBClient } from '../localRes/dynamoDBClient';
import { PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { DiamoryItem, DiamoryItemWithAccountId } from '../../../src/functions/add-item/item';
import { AnyItem } from '../types/generics';

jest.mock('../../../src/functions/add-item/dynamoDBClient', () => {
  const originalModule = jest.requireActual('../localRes/dynamoDBClient');
  return {
    ...originalModule
  };
});

const testItem: DiamoryItem = {
  id: 'id',
  checksum: '73475cb40a568e8da8a045ced110137e159f890ac4da883b6b17dc651b3a8049',
  payloadTimestamp: 42,
  keepOffline: true
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

const putAccount = async (status: string): Promise<void> => {
  const params = {
    TableName: accountTableName,
    Item: { accountId, status }
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

const deleteAccount = async (): Promise<void> => {
  const params = {
    TableName: accountTableName,
    Key: { accountId }
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
    const event = buildTestEvent('post', '/item', [], testItem);
    const { id, checksum, payloadTimestamp, keepOffline } = testItem;

    const { statusCode, body } = await lambdaHandler(event);

    const Item = (await getItem()) as unknown as DiamoryItemWithAccountId;
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(201);
    assert.that(message).is.equalTo('ok');
    assert.that(Item).is.not.undefined();
    assert.that(Item).is.not.null();
    assert.that(Item.id).is.equalTo(id);
    assert.that(Item.checksum).is.equalTo(checksum);
    assert.that(Item.payloadTimestamp).is.equalTo(payloadTimestamp);
    assert.that(Item.keepOffline).is.equalTo(keepOffline);
    assert.that(Item.accountId).is.equalTo(accountId);
  });

  test('returns with error when item already exists.', async (): Promise<void> => {
    await putAccount('active');
    const addEvent = buildTestEvent('post', '/item', [], testItem);
    await lambdaHandler(addEvent);
    const modifiedItem = { ...testItem, payloadTimestamp: 96 };
    const updateEvent = buildTestEvent('post', '/add-item', [], modifiedItem);

    const { statusCode, body } = await lambdaHandler(updateEvent);

    const Item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${itemAlreadyExistsError}`);
    assert.that(Item?.payloadTimestamp).is.equalTo(testItem.payloadTimestamp);
  });

  test('returns with error on suspended account.', async (): Promise<void> => {
    await putAccount('suspended');
    const event = buildTestEvent('post', '/item', [], testItem);

    const { statusCode, body } = await lambdaHandler(event);

    const Item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${notAllowedError}`);
    assert.that(Item).is.undefined();
  });

  test('returns with error on missing account.', async (): Promise<void> => {
    const event = buildTestEvent('post', '/item', [], testItem);

    const { statusCode, body } = await lambdaHandler(event);

    const Item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${notAllowedError}`);
    assert.that(Item).is.undefined();
  });

  test('returns with error on invalid item.', async (): Promise<void> => {
    await putAccount('active');
    const event = buildTestEvent('post', '/item', [], {});

    const { statusCode, body } = await lambdaHandler(event);

    const Item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${invalidItemError}`);
    assert.that(Item).is.undefined();
  });
});
