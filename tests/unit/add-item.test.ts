import { lambdaHandler, notAllowedError, invalidItemError } from '../../src/functions/add-item/app';
import { buildTestEvent, accountId } from './event';
import { assert } from 'assertthat';
import { dynamoDBClient, PutCommand, GetCommand, DeleteCommand } from './localRes/dynamoDBClient';
import { DiamoryItem, DiamoryItemWithAccountId } from '../../src/functions/add-item/item';
import { AnyItem } from './types/generics';

jest.mock('../../src/functions/add-item/dynamoDBClient', () => {
  const originalModule = jest.requireActual('./localRes/dynamoDBClient');
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

const itemTableName = 'diamory-item';
const accountTableName = 'diamory-account';

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

describe('Put Item', (): void => {
  afterEach(async (): Promise<void> => {
    await deleteItem();
    await deleteAccount();
  });

  test('returns with success on active account.', async (): Promise<void> => {
    await putAccount('active');
    const event = buildTestEvent('post', '/put-item', testItem);
    const { id, checksum, payloadTimestamp, keepOffline } = testItem;

    const { statusCode, body } = await lambdaHandler(event);

    const Item = (await getItem()) as unknown as DiamoryItemWithAccountId;
    assert.that(statusCode).is.equalTo(201);
    assert.that(body).is.equalTo(
      JSON.stringify({
        message: 'ok'
      })
    );
    assert.that(Item).is.not.undefined();
    assert.that(Item).is.not.null();
    assert.that(Item.id).is.equalTo(id);
    assert.that(Item.checksum).is.equalTo(checksum);
    assert.that(Item.payloadTimestamp).is.equalTo(payloadTimestamp);
    assert.that(Item.keepOffline).is.equalTo(keepOffline);
    assert.that(Item.accountId).is.equalTo(accountId);
  });

  test('returns with error on suspended account.', async (): Promise<void> => {
    await putAccount('suspended');
    const event = buildTestEvent('post', '/put-item', testItem);

    const { statusCode, body } = await lambdaHandler(event);

    const Item = await getItem();
    assert.that(statusCode).is.equalTo(500);
    assert.that(body).is.equalTo(
      JSON.stringify({
        message: `some error happened: ${notAllowedError}`
      })
    );
    assert.that(Item).is.undefined();
  });

  test('returns with error on missing account.', async (): Promise<void> => {
    const event = buildTestEvent('post', '/put-item', testItem);

    const { statusCode, body } = await lambdaHandler(event);

    const Item = await getItem();
    assert.that(statusCode).is.equalTo(500);
    assert.that(body).is.equalTo(
      JSON.stringify({
        message: `some error happened: ${notAllowedError}`
      })
    );
    assert.that(Item).is.undefined();
  });

  test('returns with error on invalid item.', async (): Promise<void> => {
    await putAccount('active');
    const event = buildTestEvent('post', '/put-item');

    const { statusCode, body } = await lambdaHandler(event);

    const Item = await getItem();
    assert.that(statusCode).is.equalTo(500);
    assert.that(body).is.equalTo(
      JSON.stringify({
        message: `some error happened: ${invalidItemError}`
      })
    );
    assert.that(Item).is.undefined();
  });
});
