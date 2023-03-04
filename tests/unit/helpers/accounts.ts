import { dynamoDBClient } from '../localRes/dynamoDBClient';
import { PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { Account } from '../types/account';

const accountTableName = process.env.AccountTableName;
const accountId = process.env.testAccountId;

const getAccount = async (): Promise<Account | undefined> => {
  const params = {
    TableName: accountTableName,
    Key: { accountId, v: 1 }
  };
  const command = new GetCommand(params);
  const Item = (await dynamoDBClient.send(command))?.Item;
  if (!Item) {
    return undefined;
  }
  return Item as unknown as Account;
};

const putAccount = async (status: string): Promise<void> => {
  const params = {
    TableName: accountTableName,
    Item: { accountId, v: 1, status }
  };
  const command = new PutCommand(params);
  await dynamoDBClient.send(command);
};

const deleteAccount = async (): Promise<void> => {
  const params = {
    TableName: accountTableName,
    Key: { accountId, v: 1 }
  };
  const command = new DeleteCommand(params);
  await dynamoDBClient.send(command);
};

export { putAccount, getAccount, deleteAccount };
