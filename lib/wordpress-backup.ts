import { User } from "@aws-cdk/aws-iam";
import { Key } from "@aws-cdk/aws-kms";
import { BlockPublicAccess, Bucket, BucketEncryption } from "@aws-cdk/aws-s3";
import { Construct, RemovalPolicy, Stack, StackProps } from "@aws-cdk/core";

export class WordpressBackup extends Stack {


    constructor(scope: Construct, id: string, props?: StackProps) {

        super(scope, id, props);

        const encryptionKey = new Key(this, `WordpressBackupEncryptionKey`, {
            description: `Used to secure the wordpress backup bucket`,
            enableKeyRotation: true
        });

        const bucket = new Bucket(this, 'rLandingBucket', {
            versioned: false,
            bucketName: 'devpalz-backup',
            encryption: BucketEncryption.KMS,
            encryptionKey,
            publicReadAccess: false,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            removalPolicy: RemovalPolicy.DESTROY
        });


        // The backup plugin on Wordpress requires an Access Key and a Secret Access key. We will create an IAM user with no permissions other than the backup policy.
        const backupUser = new User(this, 'backupUser', {
            userName: 'wordpress-backup',
        })

        // Grant required permission for our user
        bucket.grantReadWrite(backupUser);
        bucket.grantDelete(backupUser)
        encryptionKey.grantEncrypt(backupUser)

    }
}