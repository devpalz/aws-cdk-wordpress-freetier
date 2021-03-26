// import { Callback, CloudFormationCustomResourceEvent, Context } from "aws-lambda";
// import AWS = require("aws-sdk");

// /**
//  * This lambda can be invoked in your stack to bootstrap the Cognito User Pool that you provide with the `cognito/default/credentials` user
//  * and the `cognito/automated/credentials`
//  * 
//  * @param event The CFN Event - Required property `userPoolId`
//  */
// export const handler = async (event: CloudFormationCustomResourceEvent, context: Context, callback?: Callback): Promise<void> => {

//     const userPoolId = event.ResourceProperties.userPoolId;

//     if (!userPoolId) {
//         throw new Error("You must provide an 'userPoolId'")
//     }


//     const cognito = new AWS.CognitoIdentityServiceProvider();
//     const secretsManager = new AWS.SecretsManager();
//     const userCreator = new UserCreator()


//     try {

//         if (event.RequestType === 'Create') {
//             await userCreator.createUser(cognito, secretsManager, userPoolId);
//         }


//         return await CfnResponse.send(event, context, CfnResponse.SUCCESS, {});

//     } catch (error) {

//         console.log("Found error");
//         console.log(error);

//         return await CfnResponse.send(event, context, CfnResponse.FAILED, { error: error });

//     }

// }

// export interface UserDto {
//     username: string
//     password: string
// }

// export class UserCreator {


//     async createUser(cognito: AWS.CognitoIdentityServiceProvider, secretsManager: AWS.SecretsManager, userPoolId: string) {


//         const defaultUserString = await this.retrieveSecretString(secretsManager, 'cognito/default/credentials');
//         const automatedUserString = await this.retrieveSecretString(secretsManager, 'cognito/automated/credentials');


//         const defaultUser: UserDto = JSON.parse(defaultUserString)
//         const automatedUser: UserDto = JSON.parse(automatedUserString)


//         await this.createCognitoUser(cognito, userPoolId, defaultUser)
//         await this.createCognitoUser(cognito, userPoolId, automatedUser)

//     }


//     async retrieveSecretString(secretsmanager: AWS.SecretsManager, secretName: string) {

//         const cognitoDefault = await secretsmanager.getSecretValue({
//             SecretId: secretName,
//         }).promise()

//         if (cognitoDefault.SecretString) {
//             return cognitoDefault.SecretString
//         } else {
//             throw new Error(`The secret ${secretName} did not have a secret string!`)
//         }

//     }

//     async createCognitoUser(cognito: AWS.CognitoIdentityServiceProvider, userPoolId: string, userDto: UserDto) {

//         await cognito.adminCreateUser({
//             UserPoolId: userPoolId,
//             Username: userDto.username
//         }).promise()

//         await cognito.adminSetUserPassword({
//             UserPoolId: userPoolId,
//             Username: userDto.username,
//             Password: userDto.password,
//             Permanent: true
//         }).promise()

//     }

// }