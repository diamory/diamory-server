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
        console.log('1111111111111');
        await checkAccount(accountId);
        console.log('2222222222222');
        const itemWithoutAccountId: DiamoryItem = JSON.parse(event.body ?? '');
        const item = {
            ...itemWithoutAccountId,
            accountId,
        };
        console.log('3333333333333');
        addItem(item);
        console.log('4444444444444');
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'ok',
            }),
        };
    } catch (err: unknown) {
        console.log('555555555555');
        console.error({ err });
        const errMsg = err ? (err as Error).message : '';
        console.log('666666666666');
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: `some error happened: ${errMsg}`,
            }),
        };
    }
};

export { lambdaHandler, notAllowedError };
