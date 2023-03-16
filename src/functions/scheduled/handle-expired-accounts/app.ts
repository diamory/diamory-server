import { dynamoDBClient } from './dynamoDBClient';
import { QueryCommand, QueryCommandInput, UpdateCommand, UpdateCommandInput } from '@aws-sdk/lib-dynamodb';
import { SendEmailCommandInput } from '@aws-sdk/client-ses';
import { getUser, disableUser } from './cognitoClient';
import { sendMail } from './sesClient';
import { Account } from './account';

const TableName = process.env.AccountTableName;
const UserPoolId = process.env.UserPoolId;

const expireWarnSubject = 'Account wird ohne ausreichendes Guthaben in {days} Tagen gelöscht!';
const expireRemoveSubject = 'Account wurde gelöscht';
const expireWarnMessage = `
Hallo,

dein Account hat leider nicht genug Guthaben, um ihn zuverlängern.
Er wurde in einen read-only-Mode versetzt, du kannst keine Inhalt verändern.
Bitte lade deinen Account mit ausreichend Guthaben auf, um in den Normal-Modus zurückzukehren.
Ohne ausreichendes Guthaben wird er in {days} Tage(n) unwiderruflich gelöscht,
mitsamt all deiner Inhalte.

Du kannst dir diamory aktuell nicht leisten? Um Datenverlust zu vermeiden, kannst du über das Interface ein Backup erstellen.
Wenn du später wieder Geld übrig hast, kannst du in einem neuen Account die Daten mit dem Backup wiederhersellen.
Backup erstellen: https://app.diamory.de/#backup

Viele Grüße
Mark von diamory
`;
const expireRemoveMessage = `
Hallo,

leider mussten wir deinen Account aufgrund unzureichenden Guthabens unwiderruflich löschen.
Falls du zuvor ein Backup erstellt hattest, kannst du später, wenn du wieder Geld übrig hast,
in einem neuen Account die Daten mit dem Backup wiederhersellen.

Viele Grüße
Mark von diamory
`;

const calculateExpiresMonth = (): number => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(date.getDate() - 1);
  date.setHours(23);
  date.setMinutes(59);
  date.setSeconds(0);
  return date.getTime();
};

const calculateExpiresDays = (days: number): number => {
  const date = new Date();
  date.setDate(date.getDate() + days - 1);
  date.setHours(23);
  date.setMinutes(59);
  date.setSeconds(0);
  return date.getTime();
};

const handleExpiredAccount = async (account: Account): Promise<void> => {
  if (account.times > 0) {
    await expandAccount(account);
    return;
  }
  await handleUnexpandable(account);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleExpiredAccounts = async (): Promise<void> => {
  const params: QueryCommandInput = {
    TableName,
    IndexName: 'expires-index',
    ExpressionAttributeValues: {
      ':one': 1,
      ':now': Date.now()
    },
    KeyConditionExpression: 'v = :one and expires < :now'
  };
  const command = new QueryCommand(params);
  const res = await dynamoDBClient.send(command);
  const accountRecords = res.Items ?? [];

  for (const accountRecord of accountRecords) {
    await handleExpiredAccount(accountRecord as unknown as Account);
  }

  if (res.LastEvaluatedKey) {
    await handleExpiredAccounts();
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const expandAccount = async (account: Account): Promise<void> => {
  const params: UpdateCommandInput = {
    TableName,
    Key: { v: 1, accountId: account.accountId },
    ExpressionAttributeValues: {
      ':status': 'active',
      ':times': account.times - 1,
      ':expires': calculateExpiresMonth(),
      ':suspended': 0,
      ':trial': false
    },
    ExpressionAttributeNames: { '#s': 'status' },
    UpdateExpression: 'set #s = :status, times = :times, expires = :expires, suspended = :suspended, trial = :trial'
  };
  const command = new UpdateCommand(params);
  await dynamoDBClient.send(command);
};

const setSuspended = async (account: Account): Promise<void> => {
  const daysToExpire = [7, 4, 1, 1, 1];
  const params: UpdateCommandInput = {
    TableName,
    Key: { v: 1, accountId: account.accountId },
    ExpressionAttributeValues: {
      ':status': 'suspended',
      ':expires': calculateExpiresDays(daysToExpire[account.suspended]),
      ':suspended': account.suspended + 1
    },
    ExpressionAttributeNames: { '#s': 'status' },
    UpdateExpression: 'set #s = :status, expires = :expires, suspended = :suspended'
  };
  const command = new UpdateCommand(params);
  await dynamoDBClient.send(command);
};

const getEmail = async (Username: string): Promise<string> => {
  const res = await getUser({
    UserPoolId,
    Username
  });
  return res.UserAttributes?.find((e) => e.Name === 'email')?.Value ?? '';
};

const sendWarnEmail = async (email: string, days: number): Promise<void> => {
  const params: SendEmailCommandInput = {
    Source: 'account@app.diamory.de',
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: expireWarnSubject.replace('{days}', days.toString()) },
      Body: { Text: { Data: expireWarnMessage.replace('{days}', days.toString()) } }
    }
  };
  await sendMail(params);
};

const sendRemoveEmail = async (email: string): Promise<void> => {
  const params: SendEmailCommandInput = {
    Source: 'account@app.diamory.de',
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: expireRemoveSubject },
      Body: { Text: { Data: expireRemoveMessage } }
    }
  };
  await sendMail(params);
};

const disableUserAndAccount = async (accountId: string, Username: string): Promise<void> => {
  await disableUser({
    UserPoolId,
    Username
  });
  const params = {
    TableName,
    Key: { v: 1, accountId },
    ExpressionAttributeValues: {
      ':status': 'disabled',
      ':expires': Date.now() + 3600_000 // 1 hour from now, to prevent re-handling the same account
    },
    ExpressionAttributeNames: { '#s': 'status' },
    UpdateExpression: 'set #s = :status, expires = :expires'
  };
  const command = new UpdateCommand(params);
  await dynamoDBClient.send(command);
};

const handleUnexpandable = async (account: Account): Promise<void> => {
  const daysRemaining = [14, 7, 3, 2, 1];
  const email = await getEmail(account.username);
  if (account.trial || account.suspended === 5) {
    await disableUserAndAccount(account.accountId, account.username);
    await sendRemoveEmail(email);
    return;
  }
  await setSuspended(account);
  await sendWarnEmail(email, daysRemaining[account.suspended]);
};

const lambdaHandler = async (): Promise<void> => {
  try {
    await handleExpiredAccounts();
  } catch (err: unknown) {
    console.error({ err });
  }
};

export { lambdaHandler, expireWarnSubject, expireWarnMessage, expireRemoveSubject, expireRemoveMessage };
