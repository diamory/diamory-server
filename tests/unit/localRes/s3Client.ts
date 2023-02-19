import { S3Client } from '@aws-sdk/client-s3';

const config = {
  convertEmptyValues: true,
  endpoint: 'http://localhost:9000',
  forcePathStyle: true,
  sslEnabled: false,
  region: 'local',
  credentials: {
    accessKeyId: 'ALEXIAFOLEYS7EXAMPLE',
    secretAccessKey: 'w1asrXU1nFwMI/K7MDGNG/bPxRfyCYEXAMPLEKEY'
  }
};

const s3Client = new S3Client(config);

export { s3Client };
