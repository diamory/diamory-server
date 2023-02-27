import {
  GetUserCommandInput,
  GetUserCommandOutput,
  AdminUpdateUserAttributesCommandInput,
  AdminUpdateUserAttributesCommandOutput,
  AdminDisableUserCommandInput,
  AdminDisableUserCommandOutput
} from '@aws-sdk/client-cognito-identity-provider';

let accountStatus = '';
let givenUpdateUserAttributesParams: AdminUpdateUserAttributesCommandInput | null = null;
let givenDisableUserParams: AdminDisableUserCommandInput | null = null;

const setTestAccountStatus = (status: string): void => {
  accountStatus = status;
};

const getAndResetGivenUpdateUserAttributesParams = (): AdminUpdateUserAttributesCommandInput | null => {
  const value = givenUpdateUserAttributesParams;
  givenUpdateUserAttributesParams = null;
  return value;
};

const getAndResetGivenDisableUserParams = (): AdminDisableUserCommandInput | null => {
  const value = givenDisableUserParams;
  givenDisableUserParams = null;
  return value;
};

const getUser = async (params: GetUserCommandInput): Promise<GetUserCommandOutput> => {
  return {
    Username: 'testuser',
    UserAttributes: [
      {
        Name: 'email',
        Value: params?.AccessToken ?? ''
      },
      {
        Name: 'dev:custom:status',
        Value: accountStatus
      }
    ],
    $metadata: {}
  };
};

const updateUserAttributes = async (
  params: AdminUpdateUserAttributesCommandInput
): Promise<AdminUpdateUserAttributesCommandOutput> => {
  givenUpdateUserAttributesParams = params;
  return { $metadata: {} };
};

const disableUser = async (params: AdminDisableUserCommandInput): Promise<AdminDisableUserCommandOutput> => {
  givenDisableUserParams = params;
  return { $metadata: {} };
};

export {
  getUser,
  updateUserAttributes,
  disableUser,
  setTestAccountStatus,
  getAndResetGivenUpdateUserAttributesParams,
  getAndResetGivenDisableUserParams
};
