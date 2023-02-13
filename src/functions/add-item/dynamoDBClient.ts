import AWS from 'aws-sdk';

export const dynamoDBClient = new AWS.DynamoDB.DocumentClient({});
