import { lambdaHandler, invalidStatusError } from '../../../../src/functions/api/disable-user/app';
import { buildTestEvent } from '../../event';
import { assert } from 'assertthat';
import { getAndResetGivenDisableUserParams } from '../../mocks/cognitoMock';
import { putAccount, getAccount, deleteAccount } from '../../helpers/accounts';

const userPoolId = process.env.UserPool;

jest.mock('../../../../src/functions/api/disable-user/cognitoClient', () => {
  const originalModule = jest.requireActual('../../mocks/cognitoMock');
  return {
    ...originalModule
  };
});

jest.mock('../../../../src/functions/api/disable-user/dynamoDBClient', () => {
  const originalModule = jest.requireActual('../../localRes/dynamoDBClient');
  return {
    ...originalModule
  };
});

describe('Disable Accout', (): void => {
  afterEach(async (): Promise<void> => {
    await deleteAccount();
  });

  test('returns with success when user is disabled.', async (): Promise<void> => {
    await putAccount('active');
    const event = buildTestEvent('put', '/disable-user', [], '', false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const givenParams = getAndResetGivenDisableUserParams();
    const account = await getAccount();
    const { message: apiMessage } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(200);
    assert.that(apiMessage).is.equalTo('ok');
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(givenParams).is.not.null();
    assert.that(givenParams?.UserPoolId).is.equalTo(userPoolId);
    assert.that(givenParams?.Username).is.equalTo('testuser');
    assert.that(account).is.not.undefined();
    assert.that(account).is.not.null();
    assert.that(account?.status).is.equalTo('disabled');
  });

  test('returns with error if account is already disabled.', async (): Promise<void> => {
    await putAccount('disabled');
    const event = buildTestEvent('put', '/disable-user', [], '', false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const givenParams = getAndResetGivenDisableUserParams();
    const account = await getAccount();
    const { message: apiMessage } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(400);
    assert.that(apiMessage).is.equalTo(invalidStatusError);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(givenParams).is.null();
    assert.that(account).is.not.undefined();
    assert.that(account).is.not.null();
    assert.that(account?.status).is.equalTo('disabled');
  });

  test('returns with error if account does not exist.', async (): Promise<void> => {
    const event = buildTestEvent('put', '/disable-user', [], '', false);

    const { statusCode, body, headers } = await lambdaHandler(event);

    const givenParams = getAndResetGivenDisableUserParams();
    const account = await getAccount();
    const { message: apiMessage } = JSON.parse(body);
    assert.that(statusCode).is.equalTo(400);
    assert.that(apiMessage).is.equalTo(invalidStatusError);
    assert.that(headers ? headers['Content-Type'] : '').is.equalTo('application/json');
    assert.that(givenParams).is.null();
    assert.that(account).is.undefined();
  });
});
