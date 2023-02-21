# diamory-server

This repository contains the source code for [diamory](https://diamory.de/) backend (aws sam application).

## Deployment

You will need the AWS SAM CLI.

To use the SAM CLI, you need the following tools.

* SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
* Node.js - [Install Node.js 18](https://nodejs.org/en/), including the NPM package management tool.
* Docker - [Install Docker community edition](https://hub.docker.com/search/?type=edition&offering=community)

You will need an aws profile named `diamory`, with credentials specified (`~/.aws/config` and/or `~/.aws/credentials`), to run deploy command.

### First Deploy

To deploy a stack (dev or prod) that haven't already deployed into an AWS account, run:

```bash
sam build && sam deploy --guided --profile diamory
```

The first command will build the source of your application. The second command will package and deploy your application to AWS, with a series of prompts:

* **Stack Name**: The name of the stack to deploy to CloudFormation.
  This should be unique to your account and region, and a good starting point would be something matching your project name. \
  Recommendation: 
  * `diamory-server` for production stage
  * `diamory-server--dev` for development stage,
* **AWS Region**: The AWS region you want to deploy your app to. \
  Should be `eu-central-1` (default)
* **Parameter StagesEnvironment**: The stage name.
  * `staging` for development stage
  * `prod` for production stage
* **Confirm changes before deploy**: If set to yes, any change sets will be shown to you before execution for manual review.
  If set to no, the AWS SAM CLI will automatically deploy application changes.
* **Allow SAM CLI IAM role creation**: Many AWS SAM templates, including this example,
   create AWS IAM roles required for the AWS Lambda function(s) included to access AWS services. \
   Should be: `y`
* **Disable rollback**: If you don't want AWS CloudFormation to rollback changes on errors (not recommended), you can type `y` as value,
  to disable rollback
* **Save arguments to configuration files**: If set to yes, your choices will be saved to a configuration file inside the project,
  so that in the future you can just run `npm run deploy:dev` or `npm run deploy:prod`,
  without the need to give any parameters.
* **SAM configuration file**: The file name for the configuration file. Just take the default.
* **SAM configuration environment**: The name of the environment.
  * `staging` for development stage
  * `prod` for production stage

### Deploy for dev (staging)
To update or re-deploy the staging (development) stage, if it was deployed at least once, simply run:

```bash
npm run deploy:dev
```

### Deploy for prod (production)
To update or re-deploy the prod (production) stage, if it was deployed at least once, simply run:

```bash
npm run deploy:prod
```

### Notice:
If the stage never was deloyed on the AWS Account, or the the CloudFormation Source Bucket was deleted, see: [First Deploy](#first-deploy)

## Unit tests

Tests are defined in the `tests` folder in this project. Use NPM to install the [Jest test framework](https://jestjs.io/) and run unit tests.

Docker is used to setup local instances of DynamoDB and S3. \
All required tables and buckets will be created by `local/setup.sh`. Modify this file to add further resource creation commands, if needed.

To run tests, simply run:

```bash
npm run test
```

### More Information about local resource environment:
* file: [./local/docker-compose.yml](local/docker-compose.yml)
* file: [./local/setup.sh](local/setup.sh)
* docker image: [amazon/dynamodb-local](https://hub.docker.com/r/amazon/dynamodb-local)
* docker image: [minio/minio](https://hub.docker.com/r/minio/minio) (Used for local S3 buckets)

## Cleanup

To delete the application stack that you created, simply run one of the following commands,
assuming you used [recommended stack names](#first-deploy):

### For staging (development) stage
```bash
aws cloudformation delete-stack --stack-name diamory-server--dev
```

### For staging (development) stage
```bash
aws cloudformation delete-stack --stack-name diamory-server--dev
```

### Notice
To remove a stage, all S3 Buckets, specified in `template.yaml` and contained in the stage-stack must be empty. \
See [error messages](https://eu-central-1.console.aws.amazon.com/cloudformation/home) to determine which S3 Bucket deletion failed due to un-emptyness.

## Resources

See the [AWS SAM developer guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) for an introduction to SAM specification, the SAM CLI, and serverless application concepts.

## License

This project is licensed under the [MIT License](LICENSE.txt)
