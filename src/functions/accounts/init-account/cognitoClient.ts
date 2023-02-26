import {
  CognitoIdentityProviderClient,
  GetUserCommand,
  GetUserCommandInput,
  GetUserCommandOutput,
  AdminUpdateUserAttributesCommand,
  AdminUpdateUserAttributesCommandInput,
  AdminUpdateUserAttributesCommandOutput
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoIdentityProviderClient = new CognitoIdentityProviderClient({});

const getUser = async (params: GetUserCommandInput): Promise<GetUserCommandOutput> => {
  const command = new GetUserCommand(params);
  return await cognitoIdentityProviderClient.send(command);
};

const updateUserAttributes = async (
  params: AdminUpdateUserAttributesCommandInput
): Promise<AdminUpdateUserAttributesCommandOutput> => {
  const command = new AdminUpdateUserAttributesCommand(params);
  return await cognitoIdentityProviderClient.send(command);
};

export { getUser, updateUserAttributes };
