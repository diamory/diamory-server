#!/bin/bash

if [ -f "./samconfig.toml" ]
then
  sam build && sam deploy --profile diamory
else
  sam build && sam deploy --guided --profile diamory
fi
