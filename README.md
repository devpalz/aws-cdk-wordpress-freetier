# Welcome to your CDK TypeScript project!

This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template




1. openssl req -x509 -nodes -days 365 -newkey ropenssl x509 -in certificate.crt -text -noout
2. openssl rsa -in privateKey.key -text > private.pem
3. openssl x509 -inform PEM -in certificate.crt > public.pem
