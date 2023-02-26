import { lambdaHandler, accountAlreadyInitializedError } from '../../../../src/functions/accounts/init-account/app';
import { buildTestEvent, accountId } from '../../event';
import { assert } from 'assertthat';
import { setTestAccountStatus, getAndResetGivenUpdateUserAttributesParams } from '../../mocks/cognitoMock';

jest.mock('../../../../src/functions/accounts/init-account/cognitoClient', () => {
  const originalModule = jest.requireActual('../../mocks/cognitoMock');
  return {
    ...originalModule
  };
});

const testAccount = {
  status: 'active',
  credit: 0.0,
  expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
  try: true
};

describe('Add Accout', (): void => {
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
    assert
      .that(attributes?.find((e) => e.Name === 'dev:custom:try')?.Value ?? '')
      .is.equalTo(tryValue ? 'true' : 'false');
    assert
      .that(parseInt(attributes?.find((e) => e.Name === 'dev:custom:expires')?.Value ?? '0'))
      .is.atMost(expires + 10_000);
    assert
      .that(parseInt(attributes?.find((e) => e.Name === 'dev:custom:expires')?.Value ?? '0'))
      .is.atLeast(expires - 10_000);
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
