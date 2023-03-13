import { lambdaHandler, accountAlreadyCreatedError } from '../../../../src/functions/api/add-account/app';
import { buildTestEvent } from '../../event';
import { assert } from 'assertthat';
import { putAccount, getAccount, deleteAccount } from '../../helpers/accounts';
import { Account } from '../../types/account';

const accountId = process.env.testAccountId ?? '';

const fakeDateTime = new Date('2021-03-04 12:00');
const expireDateTime = new Date('2021-04-03 23:59:00');

jest.useFakeTimers().setSystemTime(fakeDateTime);

jest.mock('../../../../src/functions/api/add-account/dynamoDBClient', () => {
  const originalModule = jest.requireActual('../../localRes/dynamoDBClient');
  return {
    ...originalModule
  };
});

const testAccount: Account = {
  v: 1,
  accountId,
  username: 'testuser',
  status: 'active',
  suspended: 0,
  times: 0,
  expires: expireDateTime.getTime(),
  trial: true
};

describe('Init Accout', (): void => {
  afterEach(async (): Promise<void> => {
    await deleteAccount();
  });

  test('returns with success when account is created.', async (): Promise<void> => {
    const event = buildTestEvent('put', '/add-account', [], '', false);
    const { accountId, username, status, suspended, times, expires, trial } = testAccount;

    const { statusCode, body, headers } = await lambdaHandler(event);

    const account = await getAccount();
    const { message: apiMessage } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(201);
    assert.that(apiMessage).is.equalTo('ok');
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(account).is.not.undefined();
    assert.that(account).is.not.null();
    assert.that(account?.accountId).is.equalTo(accountId);
    assert.that(account?.username).is.equalTo(username);
    assert.that(account?.status).is.equalTo(status);
    assert.that(account?.suspended).is.equalTo(suspended);
    assert.that(account?.times).is.equalTo(times);
    assert.that(account?.expires).is.equalTo(expires);
    assert.that(account?.trial).is.equalTo(trial);
  });

  test('returns with error if account was already created.', async (): Promise<void> => {
    await putAccount('some');
    const event = buildTestEvent('put', '/add-account', [], '', false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const account = await getAccount();
    const { message: apiMessage } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(400);
    assert.that(apiMessage).is.equalTo(accountAlreadyCreatedError);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(account).is.not.undefined();
    assert.that(account).is.not.null();
    assert.that(account?.status).is.equalTo('some');
  });
});
