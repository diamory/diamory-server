import { SendEmailCommandInput, SendEmailCommandOutput } from '@aws-sdk/client-ses';

let givenMailParams: SendEmailCommandInput | null = null;

const getAndResetGivenSendEmailParams = (): SendEmailCommandInput | null => {
  const value = givenMailParams;
  givenMailParams = null;
  return value;
};

const sendMail = async (params: SendEmailCommandInput): Promise<SendEmailCommandOutput> => {
  givenMailParams = params;
  return { MessageId: '', $metadata: {} };
};

export { sendMail, getAndResetGivenSendEmailParams };
