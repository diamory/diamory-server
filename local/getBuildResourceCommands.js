/* eslint-disable @typescript-eslint/no-var-requires */
const yaml = require('js-yaml');

const yml = `
ItemTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: "diamory-item--test"
    TableClass: "STANDARD"
    BillingMode: "PAY_PER_REQUEST"
    AttributeDefinitions:
      - AttributeName: "accountId"
        AttributeType: "S"
      - AttributeName: "id"
        AttributeType: "S"
      - AttributeName: "payloadTimestamp"
        AttributeType: "N"
    KeySchema:
      - AttributeName: "accountId"
        KeyType: "HASH"
      - AttributeName: "id"
        KeyType: "RANGE"
    LocalSecondaryIndexes:
      - IndexName: timestamp-index
        KeySchema:
          - AttributeName: "accountId"
            KeyType: "HASH"
          - AttributeName: "payloadTimestamp"
            KeyType: "RANGE"
        Projection:
          NonKeyAttributes:
            - "checksum"
          ProjectionType: "INCLUDE"

PayloadsBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: "diamory-payloads--test"
    VersioningConfiguration: 
      Status: Enabled
    PublicAccessBlockConfiguration:
      BlockPublicAcls: true
      BlockPublicPolicy: true
      IgnorePublicAcls: true
      RestrictPublicBuckets: true

`;

const { ItemTable, PayloadsBucket } = yaml.load(yml);

const { TableName, BillingMode, AttributeDefinitions, KeySchema, LocalSecondaryIndexes } = ItemTable.Properties;
const tableName = TableName.startsWith('FindInMap') ? getResName(TableName) : TableName;
let command = `aws dynamodb create-table --endpoint-url http://localhost:8000 \
--table-name ${tableName} \
--attribute-definitions ${JSON.stringify(AttributeDefinitions)} \
--key-schema ${JSON.stringify(KeySchema)} \
--billing-mode ${BillingMode}`;

if (LocalSecondaryIndexes) {
  command = `${command} --local-secondary-indexes ${JSON.stringify(LocalSecondaryIndexes)}`;
}
console.log(command);

const { BucketName } = PayloadsBucket.Properties;
const bucketName = BucketName.startsWith('!FindInMap') ? getResName(BucketName) : BucketName;
const command2 = `aws s3api create-bucket --bucket ${bucketName} --endpoint-url=http://localhost:9000 --profile sam-local`;
console.log(command2);
