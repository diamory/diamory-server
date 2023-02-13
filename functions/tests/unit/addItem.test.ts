import { lambdaHandler, notAllowedError } from '../../src/addItem';
import { buildTestEvent, accountId } from './event';
import { assert } from 'assertthat';
import dynamoDBClient from '../../src/lib/dynamoDBClient';
import { DiamoryItem, DiamoryItemWithAccountId } from '../../src/types/item';
import { AnyItem } from '../../src/types/generics';

const testItem: DiamoryItem = {
    id: 'id',
    checksum: 'checksum',
    payloadTimestamp: 42,
    keepOffline: true,
};

const itemTableName = 'diamory-item';
const accountTableName = 'diamory-account';

const getItem = async (): Promise<AnyItem | undefined> => {
    const { id } = testItem;
    const params = {
        TableName: itemTableName,
        Key: { id, accountId },
    };
    return (await dynamoDBClient.get(params).promise()).Item;
};

const putAccount = async (status: string): Promise<void> => {
    const params = {
        TableName: accountTableName,
        Item: { accountId, status },
    };
    await dynamoDBClient.put(params).promise();
};

const deleteItem = async (): Promise<void> => {
    const { id } = testItem;
    const params = {
        TableName: itemTableName,
        Key: { id, accountId },
    };
    await dynamoDBClient.delete(params).promise();
};

const deleteAccount = async (): Promise<void> => {
    const params = {
        TableName: accountTableName,
        Key: { accountId },
    };
    await dynamoDBClient.delete(params).promise();
};

describe('Put Item', (): void => {
    afterEach(async (): Promise<void> => {
        await deleteItem();
        await deleteAccount();
    });

    test('returns with success on active account', async (): Promise<void> => {
        await putAccount('active');
        const event = buildTestEvent('post', '/put-item', testItem);
        const { id, checksum, payloadTimestamp, keepOffline } = testItem;

        const { statusCode, body } = await lambdaHandler(event);

        const Item = (await getItem()) as unknown as DiamoryItemWithAccountId;
        assert.that(statusCode).is.equalTo(201);
        assert.that(body).is.equalTo(
            JSON.stringify({
                message: 'ok',
            }),
        );
        assert.that(Item).is.not.undefined();
        assert.that(Item).is.not.null();
        assert.that(Item.id).is.equalTo(id);
        assert.that(Item.checksum).is.equalTo(checksum);
        assert.that(Item.payloadTimestamp).is.equalTo(payloadTimestamp);
        assert.that(Item.keepOffline).is.equalTo(keepOffline);
        assert.that(Item.accountId).is.equalTo(accountId);
    });

    test('returns with error on suspended account', async (): Promise<void> => {
        await putAccount('suspended');
        const event = buildTestEvent('post', '/put-item', testItem);

        const { statusCode, body } = await lambdaHandler(event);

        const Item = await getItem();
        assert.that(statusCode).is.equalTo(500);
        assert.that(body).is.equalTo(
            JSON.stringify({
                message: `some error happened: ${notAllowedError}`,
            }),
        );
        assert.that(Item).is.undefined();
    });

    test('returns with error on missing account', async (): Promise<void> => {
        const event = buildTestEvent('post', '/put-item', testItem);

        const { statusCode, body } = await lambdaHandler(event);

        const Item = await getItem();
        assert.that(statusCode).is.equalTo(500);
        assert.that(body).is.equalTo(
            JSON.stringify({
                message: `some error happened: ${notAllowedError}`,
            }),
        );
        assert.that(Item).is.undefined();
    });
});
