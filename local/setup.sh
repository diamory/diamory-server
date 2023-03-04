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

# create item table
aws dynamodb create-table \
  --endpoint-url http://localhost:8000 \
  --table-name diamory-item--test \
  --attribute-definitions '[{"AttributeName":"accountId","AttributeType":"S"},{"AttributeName":"id","AttributeType":"S"}]' \
  --key-schema '[{"AttributeName":"accountId","KeyType":"HASH"},{"AttributeName":"id","KeyType":"RANGE"}]' \
  --billing-mode PAY_PER_REQUEST \
  > /dev/null

  # create account table
aws dynamodb create-table \
  --endpoint-url http://localhost:8000 \
  --table-name diamory-account--test \
  --attribute-definitions '[{"AttributeName":"v","AttributeType":"N"},{"AttributeName":"accountId","AttributeType":"S"},{"AttributeName":"status","AttributeType":"S"},{"AttributeName":"expires","AttributeType":"N"}]' \
  --key-schema '[{"AttributeName":"v","KeyType":"HASH"},{"AttributeName":"accountId","KeyType":"RANGE"}]' \
  --local-secondary-indexes '[{"IndexName":"expires-index","KeySchema":[{"AttributeName":"v","KeyType":"HASH"},{"AttributeName":"expires","KeyType":"RANGE"}],"Projection":{"NonKeyAttributes":["username","status","suspended","credit"],"ProjectionType":"INCLUDE"}},{"IndexName":"status-index","KeySchema":[{"AttributeName":"v","KeyType":"HASH"},{"AttributeName":"status","KeyType":"RANGE"}],"Projection":{"NonKeyAttributes":["username"],"ProjectionType":"INCLUDE"}}]' \
  --billing-mode PAY_PER_REQUEST \
  > /dev/null

# create s3 bucket(s)
aws s3api create-bucket --bucket diamory-payloads--test --endpoint-url=http://localhost:9000 --profile sam-local > /dev/null
