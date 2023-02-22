# diamory-server

This repository contains the source code for [diamory](https://diamory.de/) backend (aws sam application).

## Deployment

You will need the AWS SAM CLI.

To use the SAM CLI, you need the following tools.

* SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
* Node.js - [Install Node.js 18](https://nodejs.org/en/), including the NPM package management tool.
* Docker - [Install Docker community edition](https://hub.docker.com/search/?type=edition&offering=community)

You will need an aws profile named `diamory`, with credentials specified (`~/.aws/config` and/or `~/.aws/credentials`), to run deploy command.

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
