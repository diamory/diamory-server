import { lambdaHandler, missingItemError } from '../../../src/functions/get-item/app';
import { buildTestEvent, accountId } from '../event';
import { itemTableName } from '../constants';
import { assert } from 'assertthat';
import { dynamoDBClient, PutCommand, DeleteCommand } from '../localRes/dynamoDBClient';
import { DiamoryItem } from '../types/item';

jest.mock('../../../src/functions/get-item/dynamoDBClient', () => {
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
  });

  test('returns item.', async (): Promise<void> => {
    await putItem();
    const { id, checksum, payloadTimestamp, keepOffline } = testItem;
    const event = buildTestEvent('get', '/get-item/{id}', [id], {});

    const { statusCode, body } = await lambdaHandler(event);

    const { message, item } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(200);
    assert.that(message).is.equalTo('ok');
    assert.that(item).is.not.undefined();
    assert.that(item).is.not.null();
    assert.that(item.id).is.equalTo(id);
    assert.that(item.checksum).is.equalTo(checksum);
    assert.that(item.payloadTimestamp).is.equalTo(payloadTimestamp);
    assert.that(item.keepOffline).is.equalTo(keepOffline);
    assert.that(item.accountId).is.undefined();
  });

  test('returns with error due to missing item.', async (): Promise<void> => {
    await putItem();
    const event = buildTestEvent('get', '/get-item/{id}', ['missing'], {});

    const { statusCode, body } = await lambdaHandler(event);

    const { message, item } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${missingItemError}`);
    assert.that(item).is.null();
  });
});
