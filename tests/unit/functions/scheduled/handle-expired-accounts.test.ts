import {
  lambdaHandler,
  expireWarnSubject,
  expireWarnMessage,
  expireRemoveSubject,
  expireRemoveMessage
} from '../../../../src/functions/scheduled/handle-expired-accounts/app';
import { assert } from 'assertthat';
import { putAccount, getAccount, deleteAccount } from '../../helpers/accounts';
import { getAndResetGivenDisableUserParams } from '../../mocks/cognitoMock';
import { getAndResetGivenSendEmailParams } from '../../mocks/sesMock';

const userPoolId = process.env.UserPoolId;
const accountId = process.env.testAccountId ?? '';
const otherAccountId = accountId + '_';

const fakeDateTime = new Date('2021-03-04 12:00');
const expireDateTimeMonth = new Date('2021-04-03 23:59:00');
const expireDateTime7Days = new Date('2021-03-10 23:59:00');
const expireDateTime4Days = new Date('2021-03-07 23:59:00');
const expireDateTimeDay = new Date('2021-03-04 23:59:00');

jest.useFakeTimers().setSystemTime(fakeDateTime);

jest.mock('../../../../src/functions/scheduled/handle-expired-accounts/dynamoDBClient', () => {
  const originalModule = jest.requireActual('../../localRes/dynamoDBClient');
  return {
    ...originalModule
  };
});

jest.mock('../../../../src/functions/scheduled/handle-expired-accounts/cognitoClient', () => {
  const originalModule = jest.requireActual('../../mocks/cognitoMock');
  return {
    ...originalModule
  };
});

jest.mock('../../../../src/functions/scheduled/handle-expired-accounts/sesClient', () => {
  const originalModule = jest.requireActual('../../mocks/sesMock');
  return {
    ...originalModule
  };
});

describe('Handle Expired Accounts', (): void => {
  afterEach(async (): Promise<void> => {
    await deleteAccount(accountId);
  });

  test('Expands one expired account of two accounts total.', async (): Promise<void> => {
    await putAccount('active', fakeDateTime.getTime() - 1, 1, false, accountId);
    await putAccount('active', fakeDateTime.getTime(), 1, false, otherAccountId);

    await lambdaHandler();

    const accountExpectedToBeExpanded = await getAccount(accountId);
    const accountExpectedToBeUntouched = await getAccount(otherAccountId);
    await deleteAccount(otherAccountId);
    assert.that(accountExpectedToBeExpanded).is.not.undefined();
    assert.that(accountExpectedToBeExpanded).is.not.null();
    assert.that(accountExpectedToBeExpanded?.expires).is.equalTo(expireDateTimeMonth.getTime());
    assert.that(accountExpectedToBeExpanded?.times).is.equalTo(0);
    assert.that(accountExpectedToBeUntouched).is.not.undefined();
    assert.that(accountExpectedToBeUntouched).is.not.null();
    assert.that(accountExpectedToBeUntouched?.expires).is.equalTo(fakeDateTime.getTime());
    assert.that(accountExpectedToBeUntouched?.times).is.equalTo(1);
    assert.that(getAndResetGivenDisableUserParams()).is.null();
    assert.that(getAndResetGivenSendEmailParams()).is.null();
  });

  test('Expands expired account and ends trial.', async (): Promise<void> => {
    await putAccount('active', fakeDateTime.getTime() - 1, 1, true, accountId);

    await lambdaHandler();

    const account = await getAccount(accountId);
    assert.that(account).is.not.undefined();
    assert.that(account).is.not.null();
    assert.that(account?.expires).is.equalTo(expireDateTimeMonth.getTime());
    assert.that(account?.times).is.equalTo(0);
    assert.that(account?.trial).is.false();
    assert.that(getAndResetGivenDisableUserParams()).is.null();
    assert.that(getAndResetGivenSendEmailParams()).is.null();
  });

  test('Expands expired account and ends suspended mode.', async (): Promise<void> => {
    await putAccount('suspended', fakeDateTime.getTime() - 1, 1, false, accountId, 1);

    await lambdaHandler();

    const account = await getAccount(accountId);
    assert.that(account).is.not.undefined();
    assert.that(account).is.not.null();
    assert.that(account?.expires).is.equalTo(expireDateTimeMonth.getTime());
    assert.that(account?.times).is.equalTo(0);
    assert.that(account?.status).is.equalTo('active');
    assert.that(account?.suspended).is.equalTo(0);
    assert.that(getAndResetGivenDisableUserParams()).is.null();
    assert.that(getAndResetGivenSendEmailParams()).is.null();
  });

  test('Switches expired account to suspended mode.', async (): Promise<void> => {
    await putAccount('active', fakeDateTime.getTime() - 1, 0, false, accountId, 0);

    await lambdaHandler();

    const account = await getAccount(accountId);
    const givenSendMailParams = getAndResetGivenSendEmailParams();
    assert.that(account).is.not.undefined();
    assert.that(account).is.not.null();
    assert.that(account?.expires).is.equalTo(expireDateTime7Days.getTime());
    assert.that(account?.times).is.equalTo(0);
    assert.that(account?.status).is.equalTo('suspended');
    assert.that(account?.suspended).is.equalTo(1);
    assert.that(getAndResetGivenDisableUserParams()).is.null();
    assert.that(givenSendMailParams).is.not.null();
    assert.that(givenSendMailParams?.Source).is.equalTo('account@app.diamory.de');
    assert.that(givenSendMailParams?.Message?.Subject?.Data).is.equalTo(expireWarnSubject.replace('{days}', '14'));
    assert.that(givenSendMailParams?.Message?.Body?.Text?.Data).is.equalTo(expireWarnMessage.replace('{days}', '14'));
    assert
      .that(givenSendMailParams?.Destination?.ToAddresses ? givenSendMailParams?.Destination?.ToAddresses[0] : '')
      .is.equalTo('testuser@mail.de');
  });

  test('Expands suspended mode from first to second.', async (): Promise<void> => {
    await putAccount('suspended', fakeDateTime.getTime() - 1, 0, false, accountId, 1);

    await lambdaHandler();

    const account = await getAccount(accountId);
    const givenSendMailParams = getAndResetGivenSendEmailParams();
    assert.that(account).is.not.undefined();
    assert.that(account).is.not.null();
    assert.that(account?.expires).is.equalTo(expireDateTime4Days.getTime());
    assert.that(account?.times).is.equalTo(0);
    assert.that(account?.status).is.equalTo('suspended');
    assert.that(account?.suspended).is.equalTo(2);
    assert.that(getAndResetGivenDisableUserParams()).is.null();
    assert.that(givenSendMailParams).is.not.null();
    assert.that(givenSendMailParams?.Source).is.equalTo('account@app.diamory.de');
    assert.that(givenSendMailParams?.Message?.Subject?.Data).is.equalTo(expireWarnSubject.replace('{days}', '7'));
    assert.that(givenSendMailParams?.Message?.Body?.Text?.Data).is.equalTo(expireWarnMessage.replace('{days}', '7'));
    assert
      .that(givenSendMailParams?.Destination?.ToAddresses ? givenSendMailParams?.Destination?.ToAddresses[0] : '')
      .is.equalTo('testuser@mail.de');
  });

  test('Expands suspended mode from second to third.', async (): Promise<void> => {
    await putAccount('suspended', fakeDateTime.getTime() - 1, 0, false, accountId, 2);

    await lambdaHandler();

    const account = await getAccount(accountId);
    const givenSendMailParams = getAndResetGivenSendEmailParams();
    assert.that(account).is.not.undefined();
    assert.that(account).is.not.null();
    assert.that(account?.expires).is.equalTo(expireDateTimeDay.getTime());
    assert.that(account?.times).is.equalTo(0);
    assert.that(account?.status).is.equalTo('suspended');
    assert.that(account?.suspended).is.equalTo(3);
    assert.that(getAndResetGivenDisableUserParams()).is.null();
    assert.that(givenSendMailParams).is.not.null();
    assert.that(givenSendMailParams?.Source).is.equalTo('account@app.diamory.de');
    assert.that(givenSendMailParams?.Message?.Subject?.Data).is.equalTo(expireWarnSubject.replace('{days}', '3'));
    assert.that(givenSendMailParams?.Message?.Body?.Text?.Data).is.equalTo(expireWarnMessage.replace('{days}', '3'));
    assert
      .that(givenSendMailParams?.Destination?.ToAddresses ? givenSendMailParams?.Destination?.ToAddresses[0] : '')
      .is.equalTo('testuser@mail.de');
  });

  test('Expands suspended mode from one 1dayer to another.', async (): Promise<void> => {
    const from = Math.round(Math.random()) ? 3 : 4;
    const to = from + 1;
    const daysLeft = from === 3 ? 2 : 1;
    await putAccount('suspended', fakeDateTime.getTime() - 1, 0, false, accountId, from);

    await lambdaHandler();

    const account = await getAccount(accountId);
    const givenSendMailParams = getAndResetGivenSendEmailParams();
    assert.that(account).is.not.undefined();
    assert.that(account).is.not.null();
    assert.that(account?.expires).is.equalTo(expireDateTimeDay.getTime());
    assert.that(account?.times).is.equalTo(0);
    assert.that(account?.status).is.equalTo('suspended');
    assert.that(account?.suspended).is.equalTo(to);
    assert.that(getAndResetGivenDisableUserParams()).is.null();
    assert.that(givenSendMailParams).is.not.null();
    assert.that(givenSendMailParams?.Source).is.equalTo('account@app.diamory.de');
    assert
      .that(givenSendMailParams?.Message?.Subject?.Data)
      .is.equalTo(expireWarnSubject.replace('{days}', daysLeft.toString()));
    assert
      .that(givenSendMailParams?.Message?.Body?.Text?.Data)
      .is.equalTo(expireWarnMessage.replace('{days}', daysLeft.toString()));
    assert
      .that(givenSendMailParams?.Destination?.ToAddresses ? givenSendMailParams?.Destination?.ToAddresses[0] : '')
      .is.equalTo('testuser@mail.de');
  });

  test('Disables finally expired account.', async (): Promise<void> => {
    await putAccount('suspended', fakeDateTime.getTime() - 1, 0, false, accountId, 5);

    await lambdaHandler();

    const account = await getAccount(accountId);
    const givenDisableUserParams = getAndResetGivenDisableUserParams();
    const givenSendMailParams = getAndResetGivenSendEmailParams();
    assert.that(account).is.not.undefined();
    assert.that(account).is.not.null();
    assert.that(account?.status).is.equalTo('disabled');
    assert.that(givenDisableUserParams).is.not.null();
    assert.that(givenDisableUserParams?.UserPoolId).is.equalTo(userPoolId);
    assert.that(givenDisableUserParams?.Username).is.equalTo('testuser');
    assert.that(givenSendMailParams).is.not.null();
    assert.that(givenSendMailParams?.Source).is.equalTo('account@app.diamory.de');
    assert.that(givenSendMailParams?.Message?.Subject?.Data).is.equalTo(expireRemoveSubject);
    assert.that(givenSendMailParams?.Message?.Body?.Text?.Data).is.equalTo(expireRemoveMessage);
    assert
      .that(givenSendMailParams?.Destination?.ToAddresses ? givenSendMailParams?.Destination?.ToAddresses[0] : '')
      .is.equalTo('testuser@mail.de');
  });

  test('Disables expired account out of trial.', async (): Promise<void> => {
    await putAccount('active', fakeDateTime.getTime() - 1, 0, true, accountId, 0);

    await lambdaHandler();

    const account = await getAccount(accountId);
    const givenDisableUserParams = getAndResetGivenDisableUserParams();
    const givenSendMailParams = getAndResetGivenSendEmailParams();
    assert.that(account).is.not.undefined();
    assert.that(account).is.not.null();
    assert.that(account?.status).is.equalTo('disabled');
    assert.that(givenDisableUserParams).is.not.null();
    assert.that(givenDisableUserParams?.UserPoolId).is.equalTo(userPoolId);
    assert.that(givenDisableUserParams?.Username).is.equalTo('testuser');
    assert.that(givenSendMailParams).is.not.null();
    assert.that(givenSendMailParams?.Source).is.equalTo('account@app.diamory.de');
    assert.that(givenSendMailParams?.Message?.Subject?.Data).is.equalTo(expireRemoveSubject);
    assert.that(givenSendMailParams?.Message?.Body?.Text?.Data).is.equalTo(expireRemoveMessage);
    assert
      .that(givenSendMailParams?.Destination?.ToAddresses ? givenSendMailParams?.Destination?.ToAddresses[0] : '')
      .is.equalTo('testuser@mail.de');
  });
});
