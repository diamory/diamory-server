# diamory-server

This repository contains the source code for [diamory](https://diamory.de/) backend (aws sam application).

## Deploy the sample application

The Serverless Application Model Command Line Interface (SAM CLI) is an extension of the AWS CLI that adds functionality for building and testing Lambda applications. It uses Docker to run your functions in an Amazon Linux environment that matches Lambda. It can also emulate your application's build environment and API.

To use the SAM CLI, you need the following tools.

* SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
* Node.js - [Install Node.js 18](https://nodejs.org/en/), including the NPM package management tool.
* Docker - [Install Docker community edition](https://hub.docker.com/search/?type=edition&offering=community)

You will a aws profile named `diamory`, with credentials specified (`~/.aws/config` and/or `~/.aws/credentials`), to run deploy command.

### First Deploy

To build and deploy your application for the first time, run the following in your shell:

```bash
npm run deploy:guided
```

The first command will build the source of your application. The second command will package and deploy your application to AWS, with a series of prompts:

* **Stack Name**: The name of the stack to deploy to CloudFormation. This should be unique to your account and region, and a good starting point would be something matching your project name.
* **AWS Region**: The AWS region you want to deploy your app to.
* **Confirm changes before deploy**: If set to yes, any change sets will be shown to you before execution for manual review. If set to no, the AWS SAM CLI will automatically deploy application changes.
* **Allow SAM CLI IAM role creation**: Many AWS SAM templates, including this example, create AWS IAM roles required for the AWS Lambda function(s) included to access AWS services. By default, these are scoped down to minimum required permissions. To deploy an AWS CloudFormation stack which creates or modifies IAM roles, the `CAPABILITY_IAM` value for `capabilities` must be provided. If permission isn't provided through this prompt, to deploy this example you must explicitly pass `--capabilities CAPABILITY_IAM` to the `sam deploy` command.
* **Save arguments to samconfig.toml**: If set to yes, your choices will be saved to a configuration file inside the project, so that in the future you can just re-run `sam deploy` without parameters to deploy changes to your application.

### Further Deployments

```bash
npm run deploy
```

## Unit tests

Tests are defined in the `tests` folder in this project. Use NPM to install the [Jest test framework](https://jestjs.io/) and run unit tests.

```bash
npm run test
```

## Cleanup

To delete the sample application that you created, use the AWS CLI. Assuming you used the project name for the stack name, you can run the following:

```bash
aws cloudformation delete-stack --stack-name diamory-server
```

## Resources

See the [AWS SAM developer guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) for an introduction to SAM specification, the SAM CLI, and serverless application concepts.

Next, you can use AWS Serverless Application Repository to deploy ready to use Apps that go beyond hello world samples and learn how authors developed their applications: [AWS Serverless Application Repository main page](https://aws.amazon.com/serverless/serverlessrepo/)

## Local resource instances for testing

When you run unit tests, local resource instances will be generated automatically, using docker. \
Currently the following resource types are supported:
* DynamoDB (AWS::DynamoDB::Table), using docker image amazon/dynamodb-local
* S3, using docker image minio/minio

See:
* file: [./local/docker-compose.yml](local/docker-compose.yml)
* file: [./local/getBuildResourceCommands.js](local/getBuildResourceCommands.js)
* docker image: [amazon/dynamodb-local](https://hub.docker.com/r/amazon/dynamodb-local)
* docker image: [minio/minio](https://hub.docker.com/r/minio/minio) (Used for local S3 buckets)

## License

This project is licensed under the [MIT License](LICENSE.txt)
