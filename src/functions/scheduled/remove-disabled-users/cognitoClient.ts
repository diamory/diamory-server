import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  AdminDeleteUserCommandInput
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoIdentityProviderClient = new CognitoIdentityProviderClient({});

const removeUser = async (params: AdminDeleteUserCommandInput): Promise<void> => {
  const command = new AdminDeleteUserCommand(params);
  await cognitoIdentityProviderClient.send(command);
};

export { removeUser };
