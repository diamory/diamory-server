import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from './dynamoDBClient';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getUser } from './cognitoClient';
import { sendEmail } from './sesClient';

const missingAccountError = 'account does not exist.';
const from = 'diamory app <account@app.diamory.de>';
const subject = 'Email-Adresse geändert';

const message = `
Hallo,

deine Email-Adresse wurde erfolgreich geändert.

Viele Grüße
`;

const headers = {
  'Content-Type': 'application/json'
};

const getEmail = async (AccessToken: string): Promise<string> => {
  const params = {
    AccessToken
  };
  const res = await getUser(params);
  return res?.UserAttributes?.find((e) => e.Name === 'email')?.Value ?? '';
};

const changeEmail = async (accountId: string, email: string): Promise<void> => {
  const params = {
    TableName: process.env.AccountTableName,
    Key: { accountId },
    ExpressionAttributeValues: {
      ':accountId': accountId,
      ':email': email
    },
    ConditionExpression: 'accountId = :accountId',
    UpdateExpression: 'set email = :email'
  };
  const command = new UpdateCommand(params);
  try {
    await dynamoDBClient.send(command);
  } catch {
    throw new Error(missingAccountError);
  }
};

const sendUpdateMail = async (email: string): Promise<void> => {
  const params = {
    Destination: {
      ToAddresses: [email]
    },
    Message: {
      Body: {
        Text: { Data: message }
      },
      Subject: { Data: subject }
    },
    Source: from
  };
  await sendEmail(params);
};

const lambdaHandler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResult> => {
  try {
    const accountId: string = event.requestContext.authorizer.jwt.claims.sub as string;
    const token = event.headers.authorization ?? '';
    const email = await getEmail(token);
    await changeEmail(accountId, email);
    await sendUpdateMail(email);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'ok'
      })
    };
  } catch (err: unknown) {
    console.error({ err });
    const errMsg = err ? (err as Error).message : '';
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: `some error happened: ${errMsg}`
      })
    };
  }
};

export { lambdaHandler, missingAccountError, from, subject, message };
