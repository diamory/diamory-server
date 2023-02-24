import { SendEmailCommandInput, SendEmailCommandOutput } from '@aws-sdk/client-ses';

interface GivenMailParams {
  From?: string;
  To?: string;
  Subject?: string;
  Message?: string;
}

let givenMailParams: GivenMailParams = {};

const getAndResetGivenParams = (): GivenMailParams => {
  const value = givenMailParams;
  givenMailParams = {};
  return value;
};

const sendEmail = async (params: SendEmailCommandInput): Promise<SendEmailCommandOutput> => {
  givenMailParams.From = params.Source;
  givenMailParams.To = params.Destination?.ToAddresses ? params.Destination.ToAddresses[0] : '';
  givenMailParams.Subject = params.Message?.Subject?.Data ?? '';
  givenMailParams.Message = params.Message?.Body?.Text?.Data ?? '';
  return { MessageId: '', $metadata: {} };
};

export { sendEmail, getAndResetGivenParams };
