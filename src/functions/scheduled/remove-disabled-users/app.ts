import { dynamoDBClient } from './dynamoDBClient';
import { s3Client } from './s3Client';
import { QueryCommand, QueryCommandInput, DeleteCommand, DeleteCommandInput } from '@aws-sdk/lib-dynamodb';
import { removeUser } from './cognitoClient';
import { Account } from './account';
import {
  ListObjectsCommand,
  ListObjectsCommandInput,
  DeleteObjectsCommand,
  DeleteObjectsCommandInput
} from '@aws-sdk/client-s3';

const TableName = process.env.AccountTableName;
const Bucket = process.env.PayloadsBucketName;
const UserPoolId = process.env.UserPoolId;

const removeItems = async (accountId: string): Promise<void> => {
  const listParams: ListObjectsCommandInput = {
    Bucket,
    Prefix: `${accountId}/`
  };
  const listCommand = new ListObjectsCommand(listParams);
  const listedObjects = await s3Client.send(listCommand);
  if (!listedObjects.Contents?.length) {
    return;
  }

  const deleteParams: DeleteObjectsCommandInput = {
    Bucket,
    Delete: { Objects: [] }
  };
  listedObjects.Contents.forEach(({ Key }) => {
    deleteParams.Delete?.Objects?.push({ Key });
  });
  const deleteCommand = new DeleteObjectsCommand(deleteParams);
  await s3Client.send(deleteCommand);

  if (listedObjects.IsTruncated) {
    await removeItems(accountId);
  }
};

const removeCognitoUser = async (Username: string): Promise<void> => {
  await removeUser({
    UserPoolId,
    Username
  });
};

const removeAccount = async (accountId: string): Promise<void> => {
  const params: DeleteCommandInput = {
    TableName,
    Key: { v: 1, accountId }
  };
  const command = new DeleteCommand(params);
  await dynamoDBClient.send(command);
};

const removeDisabledUser = async (account: Account): Promise<void> => {
  await removeItems(account.accountId);
  await removeCognitoUser(account.username);
  await removeAccount(account.accountId);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const removeDisabledUsers = async (): Promise<void> => {
  const params: QueryCommandInput = {
    TableName,
    IndexName: 'status-index',
    ExpressionAttributeValues: {
      ':one': 1,
      ':status': 'disabled'
    },
    ExpressionAttributeNames: { '#s': 'status' },
    KeyConditionExpression: 'v = :one and #s = :status'
  };
  const command = new QueryCommand(params);
  const res = await dynamoDBClient.send(command);
  const accountRecords = res.Items ?? [];

  for (const accountRecord of accountRecords) {
    await removeDisabledUser(accountRecord as unknown as Account);
  }

  if (res.LastEvaluatedKey) {
    await removeDisabledUsers();
  }
};

const lambdaHandler = async (): Promise<void> => {
  try {
    await removeDisabledUsers();
  } catch (err: unknown) {
    console.error({ err });
  }
};

export { lambdaHandler };
