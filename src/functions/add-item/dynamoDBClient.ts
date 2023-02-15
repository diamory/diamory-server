import DynamoDB from 'aws-sdk/clients/dynamodb';

export const dynamoDBClient = new DynamoDB.DocumentClient({});
