# diamory-server

This repository contains the source code for [diamory](https://diamory.de/) backend (aws sam application).

## Requisites

### new aws account
On a new AWS account, you will have to do the following steps for preparation, before you can deploy this application:
* Registrate the `diamory.de` Domain in [AWS Route 53](https://us-east-1.console.aws.amazon.com/route53/v2/home).
* Create an EmailIdentity for `app.diamory.de`, using [AWS SES](https://eu-central-1.console.aws.amazon.com/ses/home) mit folgenden Einstellungen
  * Identitätstyp: Domain
  * Domäne: app.diamory.de
  * Erweiterte DKIM-Einstellungen:
    * Indentitätstyp: Easy DKIM
    * DKIM-Signaturschlüssellänge: RSA_2048_BIT
    * Veröffentlichen von DNS-Datensätzen in Route53: true (anhaken)
    * DKIM-Signaturen: true (anhaken)
* Create a user with full access to CloudFormation and all services, used by this application.
* Save the credentials in `~/.aws/credentials` and/or `~/.aws/config` under profile `diamory`.
* Put the ID of your AWS account and the id of the hosted zone of `diamory.de` into the `samconfig.toml` file. \
  Example:
  * accountId: 42
  * hostedZoneId: Z0815
  * samconfig.toml line for staging: `parameter_overrides = "Stage='staging', Account='42', HostedZone='Z0815'"`
  * samconfig.toml line for prod:    `parameter_overrides = "Stage='prod', Account='42', HostedZone='Z0815'"`

### General
For developnent, testing and deployment you will need the following tools:

* AWS CLI - [Install the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
* SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
* Node.js - [Install Node.js 18](https://nodejs.org/en/), including the NPM package management tool.
* Docker - [Install Docker community edition](https://hub.docker.com/search/?type=edition&offering=community)

On Windows you will need [gitbash] to run `npm run test` correctly

## Deployment

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

## Price
To change the price, change it in `template.yaml` in `Global` section, and in `jest.setEnvVars.js`. Variable name: `PriceInEuro`

## Resources
See the [AWS SAM developer guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) for an introduction to SAM specification, the SAM CLI, and serverless application concepts.

## License
This project is licensed under the [MIT License](LICENSE.txt)
