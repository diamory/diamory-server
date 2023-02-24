import {
  lambdaHandler,
  accountAlreadyExistsError,
  from,
  subject,
  message
} from '../../../../src/functions/accounts/add-account/app';
import { buildTestEvent, accountId } from '../../event';
import { Account } from '../../types/account';
import { assert } from 'assertthat';
import { dynamoDBClient } from '../../localRes/dynamoDBClient';
import { PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getAndResetGivenParams } from './sesMock';

const accountTableName = process.env.AccountTableName;

jest.mock('../../../../src/functions/accounts/add-account/dynamoDBClient', () => {
  const originalModule = jest.requireActual('../../localRes/dynamoDBClient');
  return {
    ...originalModule
  };
});

jest.mock('../../../../src/functions/accounts/add-account/cognitoClient', () => {
  const originalModule = jest.requireActual('./cognitoMock');
  return {
    ...originalModule
  };
});

jest.mock('../../../../src/functions/accounts/add-account/sesClient', () => {
  const originalModule = jest.requireActual('./sesMock');
  return {
    ...originalModule
  };
});

const putAccount = async (): Promise<void> => {
  const params = {
    TableName: accountTableName,
    Item: testAccount
  };
  const command = new PutCommand(params);
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

const getAccount = async (): Promise<Account | undefined> => {
  const params = {
    TableName: accountTableName,
    Key: { accountId }
  };
  const command = new GetCommand(params);
  const res = await dynamoDBClient.send(command);
  return (res?.Item as unknown as Account) ?? null;
};

const testMail = 'test@mail.com';
const testAccount = {
  accountId,
  status: 'active',
  email: testMail,
  credit: 0.0,
  expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
  try: true
};

describe('Add Accout', (): void => {
  afterEach(async (): Promise<void> => {
    await deleteAccount();
  });

  test('returns with success when account is created.', async (): Promise<void> => {
    const event = buildTestEvent('post', '/account', [], '', false, testMail);
    const { accountId, credit, email, expires, status } = testAccount;

    const { statusCode, body, headers } = await lambdaHandler(event);

    const Account = await getAccount();
    const givenParams = getAndResetGivenParams();
    const { message: apiMessage } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(201);
    assert.that(apiMessage).is.equalTo('ok');
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(Account).is.not.null();
    assert.that(Account?.accountId).is.equalTo(accountId);
    assert.that(Account?.credit).is.equalTo(credit);
    assert.that(Account?.email).is.equalTo(email);
    assert.that(Account?.status).is.equalTo(status);
    assert.that(Account?.try).is.equalTo(true);
    assert.that(Account?.expires ?? 0).is.atMost(expires + 10_000);
    assert.that(Account?.expires ?? 0).is.atLeast(expires - 10_000);
    assert.that(givenParams?.From).is.equalTo(from);
    assert.that(givenParams?.To).is.equalTo(testMail);
    assert.that(givenParams?.Subject).is.equalTo(subject);
    assert.that(givenParams?.Message).is.equalTo(message);
  });

  test('returns with error if account already exists.', async (): Promise<void> => {
    await putAccount();
    const event = buildTestEvent('post', '/account', [], '', false, 'other@mail.com');
    const { accountId, credit, email, expires, status } = testAccount;

    const { statusCode, body, headers } = await lambdaHandler(event);

    const Account = await getAccount();
    const givenParams = getAndResetGivenParams();
    const { message } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(message).is.equalTo(`some error happened: ${accountAlreadyExistsError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(Account).is.not.null();
    assert.that(Account?.accountId).is.equalTo(accountId);
    assert.that(Account?.credit).is.equalTo(credit);
    assert.that(Account?.email).is.equalTo(email);
    assert.that(Account?.status).is.equalTo(status);
    assert.that(Account?.try).is.equalTo(true);
    assert.that(Account?.expires ?? 0).is.atMost(expires + 10_000);
    assert.that(Account?.expires ?? 0).is.atLeast(expires - 10_000);
    assert.that(givenParams?.From).is.undefined();
    assert.that(givenParams?.To).is.undefined();
    assert.that(givenParams?.Subject).is.undefined();
    assert.that(givenParams?.Message).is.undefined();
  });
});
