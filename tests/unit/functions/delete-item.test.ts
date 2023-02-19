import { lambdaHandler, missingItemError, notAllowedError } from '../../../src/functions/delete-item/app';
import { buildTestEvent, accountId } from '../event';
import { AnyItem } from '../types/generics';
import { assert } from 'assertthat';
import { dynamoDBClient } from '../localRes/dynamoDBClient';
import { PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { DiamoryItem } from '../types/item';

jest.mock('../../../src/functions/delete-item/dynamoDBClient', () => {
  const originalModule = jest.requireActual('../localRes/dynamoDBClient');
  return {
    ...originalModule
  };
});

const itemTableName = 'diamory-item';

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

describe('Delete Item', (): void => {
  afterEach(async (): Promise<void> => {
    await deleteItem();
  });

  test('returns with success when existent item is deleted.', async (): Promise<void> => {
    await putItem();
    const { id } = testItem;
    const event = buildTestEvent('delete', '/item/{id}', [id], {}, false, 'active');

    const { statusCode, body } = await lambdaHandler(event);

    const Item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(200);
    assert.that(message).is.equalTo('ok');
    assert.that(Item).is.undefined();
  });

  test('returns with error due to missing item.', async (): Promise<void> => {
    await putItem();
    const { id, checksum, payloadTimestamp } = testItem;
    const event = buildTestEvent('delete', '/item/{id}', ['missing'], {}, false, 'active');

    const { statusCode, body } = await lambdaHandler(event);

    const Item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${missingItemError}`);
    assert.that(Item).is.not.undefined();
    assert.that(Item).is.not.null();
    assert.that(Item?.id).is.equalTo(id);
    assert.that(Item?.checksum).is.equalTo(checksum);
    assert.that(Item?.payloadTimestamp).is.equalTo(payloadTimestamp);
    assert.that(Item?.accountId).is.equalTo(accountId);
  });

  test('returns with error on suspended account.', async (): Promise<void> => {
    await putItem();
    const { id, checksum, payloadTimestamp } = testItem;
    const event = buildTestEvent('delete', '/item/{id}', ['missing'], {}, false, 'suspended');

    const { statusCode, body } = await lambdaHandler(event);

    const Item = await getItem();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${notAllowedError}`);
    assert.that(Item).is.not.undefined();
    assert.that(Item).is.not.null();
    assert.that(Item?.id).is.equalTo(id);
    assert.that(Item?.checksum).is.equalTo(checksum);
    assert.that(Item?.payloadTimestamp).is.equalTo(payloadTimestamp);
    assert.that(Item?.accountId).is.equalTo(accountId);
  });
});
