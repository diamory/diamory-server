import { SESClient, SendEmailCommand, SendEmailCommandInput, SendEmailCommandOutput } from '@aws-sdk/client-ses';

const sesClient = new SESClient({});

const sendEmail = async (params: SendEmailCommandInput): Promise<SendEmailCommandOutput> => {
  const command = new SendEmailCommand(params);
  return await sesClient.send(command);
};

export { sendEmail };
