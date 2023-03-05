import {
  lambdaHandler,
  notPaidEnoughError,
  isNotTrialError,
  missingAccountError
} from '../../../../src/functions/accounts/skip-trial/app';
import { buildTestEvent } from '../../event';
import { assert } from 'assertthat';
import { putAccount, getAccount, deleteAccount } from '../../helpers/accounts';

const accountId = process.env.testAccountId ?? '';

const fakeDateTime = new Date('2021-03-04 12:00');
const expireDateTime = new Date('2021-04-03 23:59:00');

jest.useFakeTimers().setSystemTime(fakeDateTime);

jest.mock('../../../../src/functions/accounts/skip-trial/dynamoDBClient', () => {
  const originalModule = jest.requireActual('../../localRes/dynamoDBClient');
  return {
    ...originalModule
  };
});

describe('Skip Trial', (): void => {
  afterEach(async (): Promise<void> => {
    await deleteAccount();
  });

  test('returns with success when trial is skipped.', async (): Promise<void> => {
    await putAccount('active', 42, 1, true);
    const event = buildTestEvent('delete', '/account/trial', [], '', false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const account = await getAccount();
    const { message: apiMessage } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(200);
    assert.that(apiMessage).is.equalTo('ok');
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(account).is.not.undefined();
    assert.that(account).is.not.null();
    assert.that(account?.accountId).is.equalTo(accountId);
    assert.that(account?.times).is.equalTo(0);
    assert.that(account?.expires).is.equalTo(expireDateTime.getTime());
    assert.that(account?.trial).is.equalTo(false);
  });

  test('returns with error if not paid enough.', async (): Promise<void> => {
    await putAccount('active', 42, 0, true);
    const event = buildTestEvent('delete', '/account/trial', [], '', false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const account = await getAccount();
    const { message: apiMessage } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(400);
    assert.that(apiMessage).is.equalTo(`some error happened: ${notPaidEnoughError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(account).is.not.undefined();
    assert.that(account).is.not.null();
    assert.that(account?.accountId).is.equalTo(accountId);
    assert.that(account?.times).is.equalTo(0);
    assert.that(account?.expires).is.equalTo(42);
    assert.that(account?.trial).is.equalTo(true);
  });

  test('returns with error if account is not in trial state.', async (): Promise<void> => {
    await putAccount('active', 42, 1, false);
    const event = buildTestEvent('delete', '/account/trial', [], '', false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const account = await getAccount();
    const { message: apiMessage } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(400);
    assert.that(apiMessage).is.equalTo(`some error happened: ${isNotTrialError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(account).is.not.undefined();
    assert.that(account).is.not.null();
    assert.that(account?.accountId).is.equalTo(accountId);
    assert.that(account?.times).is.equalTo(1);
    assert.that(account?.expires).is.equalTo(42);
    assert.that(account?.trial).is.equalTo(false);
  });

  test('returns with error if account does not exist.', async (): Promise<void> => {
    const event = buildTestEvent('delete', '/account/trial', [], '', false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const account = await getAccount();
    const { message: apiMessage } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(404);
    assert.that(apiMessage).is.equalTo(`some error happened: ${missingAccountError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(account).is.undefined();
  });
});
