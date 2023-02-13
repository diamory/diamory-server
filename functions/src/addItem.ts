import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import dynamoDBClient from './lib/dynamoDBClient';
import { DiamoryItem, DiamoryItemWithAccountId } from './types/item';

const notAllowedError = 'you are not allowed to do so';

const checkAccount = async (accountId: string): Promise<void> => {
    const params = {
        Key: { accountId },
        TableName: 'diamory-account',
    };
    const { Item } = await dynamoDBClient.get(params).promise();

    if (!Item) {
        throw new Error(notAllowedError);
    }
    if (Item.status !== 'active') {
        throw new Error(notAllowedError);
    }
};

const addItem = async (Item: DiamoryItemWithAccountId): Promise<void> => {
    const params = { TableName: 'diamory-item', Item };
    await dynamoDBClient.put(params).promise();
};

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const { accountId } = event.requestContext;
        await checkAccount(accountId);
        const itemWithoutAccountId: DiamoryItem = JSON.parse(event.body ?? '');
        const item = {
            ...itemWithoutAccountId,
            accountId,
        };
        await addItem(item);
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'ok',
            }),
        };
    } catch (err: unknown) {
        console.error({ err });
        const errMsg = err ? (err as Error).message : '';
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: `some error happened: ${errMsg}`,
            }),
        };
    }
};

export { lambdaHandler, notAllowedError };
