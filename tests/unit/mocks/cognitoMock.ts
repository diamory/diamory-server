import { AdminDisableUserCommandInput, AdminDisableUserCommandOutput } from '@aws-sdk/client-cognito-identity-provider';

let givenDisableUserParams: AdminDisableUserCommandInput | null = null;

const getAndResetGivenDisableUserParams = (): AdminDisableUserCommandInput | null => {
  const value = givenDisableUserParams;
  givenDisableUserParams = null;
  return value;
};

const disableUser = async (params: AdminDisableUserCommandInput): Promise<AdminDisableUserCommandOutput> => {
  givenDisableUserParams = params;
  return { $metadata: {} };
};

export { disableUser, getAndResetGivenDisableUserParams };
