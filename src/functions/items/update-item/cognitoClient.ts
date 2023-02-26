import {
  CognitoIdentityProviderClient,
  GetUserCommand,
  GetUserCommandInput,
  GetUserCommandOutput
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoIdentityProviderClient = new CognitoIdentityProviderClient({});

const getUser = async (params: GetUserCommandInput): Promise<GetUserCommandOutput> => {
  const command = new GetUserCommand(params);
  return await cognitoIdentityProviderClient.send(command);
};

export { getUser };
