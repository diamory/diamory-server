import DynamoDB from 'aws-sdk/clients/dynamodb';

const config = {
    convertEmptyValues: true,
    endpoint: 'localhost:8000',
    sslEnabled: false,
    region: 'local',
};

export const dynamoDBClient = new DynamoDB.DocumentClient(config);
