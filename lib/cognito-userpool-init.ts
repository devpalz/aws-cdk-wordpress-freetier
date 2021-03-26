import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { Code, Runtime } from "@aws-cdk/aws-lambda";
import { RetentionDays } from "@aws-cdk/aws-logs";
import { Construct, CustomResource, Duration, Stack } from "@aws-cdk/core";
import lambda = require("@aws-cdk/aws-lambda");
import cognito = require('@aws-cdk/aws-cognito')


/**
 * Creates a Cognito User pool with the default & automated user accounts.
 */
export class CognitoUserPoolBootstrapped extends Construct {

    userPool: cognito.IUserPool
    userPoolDomain: cognito.IUserPoolDomain

    constructor(stack: Stack, id: string) {
        super(stack, id)


        const userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: 'basic-auth-pool',
            signInAliases: {
                username: true
            },
            passwordPolicy: {
                minLength: 10,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                tempPasswordValidity: Duration.days(1),
            },
        });

        const domain = userPool.addDomain('CognitoDomain', {
            cognitoDomain: {
                domainPrefix: 'basic-auth',
            },
        });

        const boostrapUserpool = new lambda.Function(this, 'CognitoBootstrapLambda', {
            code: Code.fromAsset(`${__dirname}/../dist/cognito_bootstrap`),
            handler: 'main.handler',
            runtime: Runtime.NODEJS_12_X,
            logRetention: RetentionDays.ONE_WEEK,
        });

        boostrapUserpool.addToRolePolicy(new PolicyStatement({
            actions: ['secretsmanager:GetSecretValue'],
            resources: [
                `arn:aws:secretsmanager:${stack.region}:${stack.account}:secret:cognito/default/credentials-??????`,
                `arn:aws:secretsmanager:${stack.region}:${stack.account}:secret:cognito/automated/credentials-??????`
            ],
            effect: Effect.ALLOW
        }))

        boostrapUserpool.addToRolePolicy(new PolicyStatement({
            actions: ['cognito-idp:AdminCreateUser', 'cognito-idp:AdminSetUserPassword'],
            resources: [userPool.userPoolArn],
            effect: Effect.ALLOW
        }))


        new CustomResource(this, 'CognitoBootstrapInvoke', {
            resourceType: 'Custom::CognitoBootstrapInvoke',
            serviceToken: boostrapUserpool.functionArn,
            properties: {
                userPoolId: userPool.userPoolId
            }
        });

        this.userPool = userPool;
        this.userPoolDomain = domain

    }
}

