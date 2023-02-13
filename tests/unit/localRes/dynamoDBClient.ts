import AWS from 'aws-sdk';

const config = {
    convertEmptyValues: true,
    endpoint: 'localhost:8000',
    sslEnabled: false,
    region: 'local',
};

export const dynamoDBClient = new AWS.DynamoDB.DocumentClient(config);
