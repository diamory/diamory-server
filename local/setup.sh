#!/bin/bash

PROFILE=sam-local
CONFIG_FILE=~/.aws/config

# build
sam build
cd local

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
      echo "region = de"
      echo ""
    } >>$CONFIG_FILE
fi

#create dynamo db table(s) and s3 bucket(s)
commands=$(node getBuildResourceCommands.js)
echo -e "$commands" | while read command
do
  $command >/dev/null
done

cd -
