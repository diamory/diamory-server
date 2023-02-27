import { lambdaHandler } from '../../../../src/functions/accounts/disable-account/app';
import { buildTestEvent } from '../../event';
import { assert } from 'assertthat';
import { getAndResetGivenDisableUserParams } from '../../mocks/cognitoMock';

jest.mock('../../../../src/functions/accounts/disable-account/cognitoClient', () => {
  const originalModule = jest.requireActual('../../mocks/cognitoMock');
  return {
    ...originalModule
  };
});

describe('Disable Accout', (): void => {
  test('returns with success when account is disabled.', async (): Promise<void> => {
    const event = buildTestEvent('put', '/account/disable', [], '', false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const attributes = getAndResetGivenDisableUserParams();
    const { message: apiMessage } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(200);
    assert.that(apiMessage).is.equalTo('ok');
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(attributes).is.not.undefined();
    assert.that(attributes).is.not.null();
    assert.that(attributes?.UserPoolId).is.equalTo(process.env.UserPoolId);
    assert.that(attributes?.Username).is.equalTo('testuser');
  });
});
