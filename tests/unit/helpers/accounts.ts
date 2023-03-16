import { dynamoDBClient } from '../localRes/dynamoDBClient';
import {
  PutCommand,
  PutCommandInput,
  GetCommand,
  GetCommandInput,
  DeleteCommand,
  DeleteCommandInput
} from '@aws-sdk/lib-dynamodb';
import { Account } from '../types/account';

const accountTableName = process.env.AccountTableName;
const accountId = process.env.testAccountId ?? '';

const getAccount = async (accountIdToUse = accountId): Promise<Account | undefined> => {
  const params: GetCommandInput = {
    TableName: accountTableName,
    Key: { accountId: accountIdToUse, v: 1 }
  };
  const command = new GetCommand(params);
  const Item = (await dynamoDBClient.send(command))?.Item;
  if (!Item) {
    return undefined;
  }
  return Item as unknown as Account;
};

const putAccount = async (
  status: string,
  expires = 0,
  times = 0,
  trial = false,
  accountIdToUse?: string,
  suspended = 0
): Promise<void> => {
  const Item: Account = {
    v: 1,
    accountId: accountIdToUse ?? accountId,
    username: 'testuser',
    status,
    expires,
    times,
    trial,
    suspended
  };
  const params: PutCommandInput = {
    TableName: accountTableName,
    Item
  };
  const command = new PutCommand(params);
  await dynamoDBClient.send(command);
};

const deleteAccount = async (accountIdToUse = accountId): Promise<void> => {
  const params: DeleteCommandInput = {
    TableName: accountTableName,
    Key: { accountId: accountIdToUse, v: 1 }
  };
  const command = new DeleteCommand(params);
  await dynamoDBClient.send(command);
};

export { putAccount, getAccount, deleteAccount };
