import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamoDBClient = DynamoDBDocumentClient.from(client);

export { dynamoDBClient };
