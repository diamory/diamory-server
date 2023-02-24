import { GetUserCommandInput, GetUserCommandOutput } from '@aws-sdk/client-cognito-identity-provider';

const getUser = async (params: GetUserCommandInput): Promise<GetUserCommandOutput> => {
  return {
    Username: 'testuser',
    UserAttributes: [
      {
        Name: 'email',
        Value: params?.AccessToken ?? ''
      }
    ],
    $metadata: {}
  };
};

export { getUser };
