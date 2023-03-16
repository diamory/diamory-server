import { lambdaHandler } from '../../../../src/functions/scheduled/remove-disabled-users/app';
import { assert } from 'assertthat';
import { s3Client } from '../../localRes/s3Client';
import {
  PutObjectCommand,
  PutObjectCommandInput,
  GetObjectCommand,
  GetObjectCommandInput,
  GetObjectCommandOutput,
  DeleteObjectCommand,
  DeleteObjectCommandInput
} from '@aws-sdk/client-s3';
import { putAccount, getAccount, deleteAccount } from '../../helpers/accounts';
import { getAndResetGivenRemoveUserParams } from '../../mocks/cognitoMock';

type ObjectOrNull = GetObjectCommandOutput | null;

const userPoolId = process.env.UserPoolId;
const Bucket = process.env.PayloadsBucketName;
const accountId = process.env.testAccountId ?? '';
const otherAccountId = accountId + '_';

jest.mock('../../../../src/functions/scheduled/remove-disabled-users/dynamoDBClient', () => {
  const originalModule = jest.requireActual('../../localRes/dynamoDBClient');
  return {
    ...originalModule
  };
});

jest.mock('../../../../src/functions/scheduled/remove-disabled-users/s3Client', () => {
  const originalModule = jest.requireActual('../../localRes/s3Client');
  return {
    ...originalModule
  };
});

jest.mock('../../../../src/functions/scheduled/remove-disabled-users/cognitoClient', () => {
  const originalModule = jest.requireActual('../../mocks/cognitoMock');
  return {
    ...originalModule
  };
});

const putObjects = async (): Promise<void> => {
  await putObject('obj1');
  await putObject('obj2');
  await putObject('obj3');
};

const putObject = async (id: string): Promise<void> => {
  const params: PutObjectCommandInput = {
    Bucket,
    Key: `${accountId}/${id}`,
    Body: new Uint8Array(8)
  };
  const command = new PutObjectCommand(params);
  await s3Client.send(command);
};

const deleteObjects = async (): Promise<void> => {
  await removeObject('obj1');
  await removeObject('obj2');
  await removeObject('obj3');
};

const removeObject = async (id: string): Promise<void> => {
  const params: DeleteObjectCommandInput = {
    Bucket,
    Key: `${accountId}/${id}`
  };
  const command = new DeleteObjectCommand(params);
  await s3Client.send(command);
};

const getObjects = async (): Promise<ObjectOrNull[]> => {
  return [await getObject('/obj1'), await getObject('/obj2'), await getObject('/obj3')];
};

const getObject = async (idPath: string): Promise<GetObjectCommandOutput | null> => {
  const params: GetObjectCommandInput = {
    Bucket,
    Key: `${accountId}${idPath}`
  };
  const command = new GetObjectCommand(params);
  try {
    return await s3Client.send(command);
  } catch {
    return null;
  }
};

describe('Remove Disabled Users', (): void => {
  test("Removes user 1, it's account and it's data, keep user 2.", async (): Promise<void> => {
    await putAccount('disabled', 0, 0, false, accountId);
    await putAccount('active', 0, 0, false, otherAccountId);
    await putObjects();

    await lambdaHandler();

    const accountExpectedToBeRemoved = await getAccount(accountId);
    const accountExpectedToBeUntouched = await getAccount(otherAccountId);
    const givenRemoveUserParams = getAndResetGivenRemoveUserParams();
    const objects = await getObjects();
    const directory = await getObject('');
    assert.that(accountExpectedToBeRemoved).is.undefined();
    assert.that(accountExpectedToBeUntouched).is.not.undefined();
    assert.that(accountExpectedToBeUntouched).is.not.null();
    assert.that(accountExpectedToBeUntouched?.status).is.equalTo('active');
    assert.that(objects[0]).is.null();
    assert.that(objects[1]).is.null();
    assert.that(objects[2]).is.null();
    assert.that(directory).is.null();
    assert.that(givenRemoveUserParams).is.not.null();
    assert.that(givenRemoveUserParams?.UserPoolId).is.equalTo(userPoolId);
    assert.that(givenRemoveUserParams?.Username).is.equalTo('testuser');
    await deleteAccount(accountId);
    await deleteAccount(otherAccountId);
    await deleteObjects();
  });
});
