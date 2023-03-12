import {
  CognitoIdentityProviderClient,
  AdminDisableUserCommand,
  AdminDisableUserCommandInput,
  AdminDisableUserCommandOutput
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoIdentityProviderClient = new CognitoIdentityProviderClient({});

const disableUser = async (params: AdminDisableUserCommandInput): Promise<AdminDisableUserCommandOutput> => {
  const command = new AdminDisableUserCommand(params);
  return await cognitoIdentityProviderClient.send(command);
};

export { disableUser };
