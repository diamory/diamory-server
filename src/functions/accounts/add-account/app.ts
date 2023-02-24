import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from './dynamoDBClient';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { getUser } from './cognitoClient';
import { sendEmail } from './sesClient';

const accountAlreadyExistsError = 'account already exists.';
const from = 'diamory app <account@app.diamory.de>';
const subject = 'Es kann losgehen';

const message = `
Hallo,

du kannst diamory ab sofort nutzen.

In den nächsten 30 Tagen, kannst du diamory uneingeschränkt gratis nutzen.
Innerhalb der 30 Tage musst du ausreichendes Guthaben einzahlen, um diamory danach weiter nutzen zu können.
Ist am Ende der 30 Tage keine ausreichende Zahlung erfolgt, wird dein Account mitsamt all deiner Daten und Inhalte unwiderruflich gelöscht.
Viel Spaß beim Tagebuch schreiben - Privat, sicher verschlüsselt.

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

const addAccount = async (accountId: string, email: string): Promise<void> => {
  const params = {
    TableName: process.env.AccountTableName,
    Item: {
      accountId,
      email,
      status: 'active',
      expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
      credit: 0,
      try: true
    },
    ConditionExpression: 'attribute_not_exists(accountId)'
  };
  const command = new PutCommand(params);
  try {
    await dynamoDBClient.send(command);
  } catch {
    throw new Error(accountAlreadyExistsError);
  }
};

const sendStartMail = async (email: string): Promise<void> => {
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
    await addAccount(accountId, email);
    await sendStartMail(email);
    return {
      statusCode: 201,
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

export { lambdaHandler, accountAlreadyExistsError, from, subject, message };
