import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamoDBClient = DynamoDBDocumentClient.from(client); // client is DynamoDB client

export { dynamoDBClient, PutCommand, GetCommand };
