import {
  AdminDisableUserCommandInput,
  AdminGetUserCommandInput,
  AdminGetUserCommandOutput,
  AdminDeleteUserCommandInput
} from '@aws-sdk/client-cognito-identity-provider';

let givenDisableUserParams: AdminDisableUserCommandInput | null = null;
let givenRemoveUserParams: AdminDeleteUserCommandInput | null = null;

const getUser = (params: AdminGetUserCommandInput): AdminGetUserCommandOutput => {
  return {
    Username: params.Username,
    UserAttributes: [{ Name: 'email', Value: 'testuser@mail.de' }],
    $metadata: {}
  };
};

const getAndResetGivenDisableUserParams = (): AdminDisableUserCommandInput | null => {
  const value = givenDisableUserParams;
  givenDisableUserParams = null;
  return value;
};

const getAndResetGivenRemoveUserParams = (): AdminDeleteUserCommandInput | null => {
  const value = givenRemoveUserParams;
  givenRemoveUserParams = null;
  return value;
};

const disableUser = async (params: AdminDisableUserCommandInput): Promise<void> => {
  givenDisableUserParams = params;
};

const removeUser = async (params: AdminDeleteUserCommandInput): Promise<void> => {
  givenRemoveUserParams = params;
};

export { getUser, disableUser, removeUser, getAndResetGivenDisableUserParams, getAndResetGivenRemoveUserParams };
