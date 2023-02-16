import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const config = {
  convertEmptyValues: true,
  endpoint: 'http://localhost:8000',
  sslEnabled: false,
  region: 'local'
};

const client = new DynamoDBClient(config);
const dynamoDBClient = DynamoDBDocumentClient.from(client);

export { dynamoDBClient };
