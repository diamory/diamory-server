import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminGetUserCommandInput,
  AdminGetUserCommandOutput,
  AdminDisableUserCommand,
  AdminDisableUserCommandInput,
  AdminDisableUserCommandOutput
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoIdentityProviderClient = new CognitoIdentityProviderClient({});

const getUser = async (params: AdminGetUserCommandInput): Promise<AdminGetUserCommandOutput> => {
  const command = new AdminGetUserCommand(params);
  return await cognitoIdentityProviderClient.send(command);
};

const disableUser = async (params: AdminDisableUserCommandInput): Promise<AdminDisableUserCommandOutput> => {
  const command = new AdminDisableUserCommand(params);
  return await cognitoIdentityProviderClient.send(command);
};

export { getUser, disableUser };
