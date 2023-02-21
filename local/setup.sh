#!/bin/bash

PROFILE=sam-local
CONFIG_FILE=~/.aws/config

# start docker environment
echo "setup docker environment"
docker-compose up -d
touch running

#add local minio credentials to ~/.aws/config file
if ! grep -q "profile $PROFILE" "$CONFIG_FILE"
then
  {
    echo "[profile $PROFILE]"
    echo "aws_access_key_id = ALEXIAFOLEYS7EXAMPLE"
    printf 'aws_secret_access_key = w1asrXU1nFwMI/K7MDGNG/bPxRfyCYEXAMPLEKEY\n'
    echo "region = local"
    echo ""
  } >>$CONFIG_FILE
fi

# create dynamo db table(s)
aws dynamodb create-table \
  --endpoint-url http://localhost:8000 \
  --table-name diamory-item--test \
  --attribute-definitions '[{"AttributeName":"accountId","AttributeType":"S"},{"AttributeName":"id","AttributeType":"S"},{"AttributeName":"payloadTimestamp","AttributeType":"N"}]' \
  --key-schema '[{"AttributeName":"accountId","KeyType":"HASH"},{"AttributeName":"id","KeyType":"RANGE"}]' \
  --billing-mode PAY_PER_REQUEST \
  --local-secondary-indexes '[{"IndexName":"timestamp-index","KeySchema":[{"AttributeName":"accountId","KeyType":"HASH"},{"AttributeName":"payloadTimestamp","KeyType":"RANGE"}],"Projection":{"NonKeyAttributes":["checksum"],"ProjectionType":"INCLUDE"}}]' \
  > /dev/null

# create s3 bucket(s)
aws s3api create-bucket --bucket diamory-payloads--test --endpoint-url=http://localhost:9000 --profile sam-local > /dev/null
