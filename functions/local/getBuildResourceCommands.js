/* eslint-disable @typescript-eslint/no-var-requires */
const yaml = require('js-yaml');
const fs = require('fs');

const { Resources } = yaml.load(fs.readFileSync('../../template.yaml', 'utf8').replace(/![a-zA-Z]+/g, ''));

const resourcesArray = Object.keys(Resources).map((key) => Resources[key]);

const tablesArray = resourcesArray.filter((e) => e.Type === 'AWS::DynamoDB::Table');
const bucketArray = resourcesArray.filter((e) => e.Type === 'AWS::S3::Bucket');

for (const table of tablesArray) {
    const { TableName, BillingMode, AttributeDefinitions, KeySchema, LocalSecondaryIndexes } = table.Properties;
    let command = `aws dynamodb create-table --endpoint-url http://localhost:8000 \
    --table-name ${TableName} \
    --attribute-definitions ${JSON.stringify(AttributeDefinitions)} \
    --key-schema ${JSON.stringify(KeySchema)} \
    --billing-mode ${BillingMode}`;

    if (LocalSecondaryIndexes) {
        command = `${command} --local-secondary-indexes ${JSON.stringify(LocalSecondaryIndexes)}`;
    }
    console.log(command);
}

for (const bucket of bucketArray) {
    const { BucketName } = bucket.Properties;
    const command = `aws s3api create-bucket --bucket ${BucketName} --endpoint-url=http://localhost:9000 --profile sam-local`;
    console.log(command);
}