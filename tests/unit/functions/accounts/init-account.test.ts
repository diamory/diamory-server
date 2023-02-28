import { lambdaHandler, accountAlreadyInitializedError } from '../../../../src/functions/accounts/init-account/app';
import { buildTestEvent } from '../../event';
import { assert } from 'assertthat';
import { setTestAccountStatus, getAndResetGivenUpdateUserAttributesParams } from '../../mocks/cognitoMock';

const fakeDateTime = new Date('2021-03-04 12:00');
const expireDateTime = new Date('2021-04-03 23:59:00');

jest.useFakeTimers().setSystemTime(fakeDateTime);

jest.mock('../../../../src/functions/accounts/init-account/cognitoClient', () => {
  const originalModule = jest.requireActual('../../mocks/cognitoMock');
  return {
    ...originalModule
  };
});

const testAccount = {
  status: 'active',
  credit: 0.0,
  expires: expireDateTime.getTime(),
  try: true
};

describe('Init Accout', (): void => {
  test('returns with success when account is initialized.', async (): Promise<void> => {
    setTestAccountStatus('');
    const event = buildTestEvent('put', '/account', [], '', false);
    const { credit, expires, status, try: tryValue } = testAccount;

    const { statusCode, body, headers } = await lambdaHandler(event);

    const attributes = getAndResetGivenUpdateUserAttributesParams()?.UserAttributes;
    const { message: apiMessage } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(201);
    assert.that(apiMessage).is.equalTo('ok');
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(attributes).is.not.undefined();
    assert.that(attributes).is.not.null();
    assert.that(attributes?.find((e) => e.Name === 'dev:custom:status')?.Value ?? '').is.equalTo(status);
    assert.that(attributes?.find((e) => e.Name === 'dev:custom:credit')?.Value ?? '').is.equalTo(credit.toString());
    assert.that(parseInt(attributes?.find((e) => e.Name === 'dev:custom:expires')?.Value ?? '0')).is.equalTo(expires);
    assert
      .that(attributes?.find((e) => e.Name === 'dev:custom:try')?.Value ?? '')
      .is.equalTo(tryValue ? 'true' : 'false');
  });

  test('returns with error if account was already initialized.', async (): Promise<void> => {
    setTestAccountStatus('active');
    const event = buildTestEvent('put', '/account', [], '', false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const attributes = getAndResetGivenUpdateUserAttributesParams()?.UserAttributes;
    const { message: apiMessage } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(500);
    assert.that(apiMessage).is.equalTo(`some error happened: ${accountAlreadyInitializedError}`);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(attributes).is.undefined();
  });
});
