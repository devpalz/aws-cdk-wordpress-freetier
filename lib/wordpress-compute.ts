import { AmazonLinuxEdition, AmazonLinuxGeneration, AmazonLinuxStorage, AmazonLinuxVirt, BlockDeviceVolume, EbsDeviceVolumeType, Instance, InstanceClass, InstanceSize, InstanceType, IVpc, MachineImage, Peer, Port, SecurityGroup, SubnetType } from "@aws-cdk/aws-ec2";
import { ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { DatabaseInstance, DatabaseInstanceEngine, MysqlEngineVersion } from '@aws-cdk/aws-rds';
import { CfnOutput, Construct, Stack, StackProps, Tag } from "@aws-cdk/core";

export interface AwsWordpressStackProps extends StackProps {
    vpc: IVpc
}

export class WordpressComputeStack extends Stack {

    wordpressServer: Instance
    wordpressServerClientSg: SecurityGroup

    constructor(scope: Construct, id: string, props: AwsWordpressStackProps) {
        super(scope, id, props);

        const role = this.createWebAppRole()


        // Create ec2 security group for clients
        const clientSecurityGroup = new SecurityGroup(this, 'wordpressAppServerSgClients', {
            vpc: props.vpc,
            allowAllOutbound: false,
            description: "Security group for Services who wish to talk to our Application Server Applications",
        });
        Tag.add(clientSecurityGroup, 'Name', 'wordpress-app-server-sg-client')

        // Create ec2 security group
        const securityGroup = new SecurityGroup(this, 'wordpressAppServerSg', {
            vpc: props.vpc,
            allowAllOutbound: false,
            description: "Security group for our EC2 instance",
        });
        Tag.add(securityGroup, 'Name', 'wordpress-app-server-sg')

        // Another AWS Service can use the 'clientSecurityGroup' to talk to this EC2 on 443 and 80. We allow outbouund over https so the EC2 can download software etc.
        // Notice that we do not allow anyone from the public internet to hit out EC2.
        securityGroup.connections.allowFrom(clientSecurityGroup, Port.tcp(443), 'Allow clients to hit our EC2 over HTTPS');
        securityGroup.connections.allowFrom(clientSecurityGroup, Port.tcp(80), 'Allow clients to hit our EC2 on HTTP');
        securityGroup.addEgressRule(Peer.anyIpv4(), Port.tcp(443), 'Allow EC2 outbound on HTTPs')
        securityGroup.addEgressRule(Peer.anyIpv4(), Port.tcp(80), 'Allow EC2 outbound on HTTP')

        new CfnOutput(this, 'clientEc2SgId', {
            description: 'clientEc2SgId',
            exportName: 'clientEc2SgId',
            value: clientSecurityGroup.securityGroupId
        });


        this.wordpressServerClientSg = clientSecurityGroup;

        const appServer = new Instance(this, 'ec2', {
            vpc: props.vpc,
            role,
            vpcSubnets: {
                subnetType: SubnetType.PUBLIC
            },
            instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
            machineImage: MachineImage.latestAmazonLinux({
                generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
                edition: AmazonLinuxEdition.STANDARD,
                virtualization: AmazonLinuxVirt.HVM,
                storage: AmazonLinuxStorage.GENERAL_PURPOSE,
            }),
            blockDevices: [
                {
                    deviceName: '/dev/xvda',
                    volume: BlockDeviceVolume.ebs(30, {
                        deleteOnTermination: true,
                        encrypted: false, // maybe?
                        volumeType: EbsDeviceVolumeType.GENERAL_PURPOSE_SSD,
                    })
                }
            ],
            securityGroup
        });
        appServer.userData.addCommands(
            "set -eux",
            'yum update -y',
            "yum install -y git",
            "git config --system credential.helper \'!aws codecommit credential-helper $@\'",
            "git config --system credential.UseHttpPath \'true\'",
            "git clone https://git-codecommit.eu-west-2.amazonaws.com/v1/repos/aws-wordpress-ansible",
            "amazon-linux-extras install ansible2 -y"
        );


        // Create ec2 security group for clients
        const databaseSeverSg = new SecurityGroup(this, 'databaseServerSg', {
            vpc: props.vpc,
            allowAllOutbound: false,
            description: "Security group to protect our RDS Database",
        });
        Tag.add(databaseSeverSg, 'Name', 'wordpress-database-sg')

        // create a security group that gives access to our rds instance
        const dbClientSg = new SecurityGroup(this, 'dbclientSg', {
            vpc: props.vpc,
            allowAllOutbound: false,
            description: "Security group for clients who wish to connect to our instance",
        });
        Tag.add(dbClientSg, 'Name', 'wordpress-database-sg-client')

        dbClientSg.addEgressRule(databaseSeverSg, Port.tcp(3306), 'Allow outbound to rds')
        databaseSeverSg.addIngressRule(dbClientSg, Port.tcp(3306), 'Allow connections from clients')
        databaseSeverSg.addIngressRule(Peer.anyIpv4(), Port.tcp(3306), 'Allow internet to access on 3306')

        appServer.addSecurityGroup(dbClientSg);

        // Set up an RDS Instance
        const instance = new DatabaseInstance(this, 'Instance', {
            engine: DatabaseInstanceEngine.mysql({ version: MysqlEngineVersion.VER_5_7 }),
            instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
            masterUsername: 'sysadmin',
            vpc: props.vpc,
            vpcPlacement: {
                subnetType: SubnetType.PUBLIC
            },
            securityGroups: [databaseSeverSg],
            allocatedStorage: 20,
            availabilityZone: "eu-west-2a",
            deletionProtection: false,
            //databaseName: 'wordpress'
        });



        Tag.add(appServer, 'RDS_Endpoint', instance.dbInstanceEndpointAddress)

        let secretName = instance.secret?.secretArn.split(":")[2]

        if (instance.secret) {

            // Allow the app server to find out the password of our secret
            appServer.addToRolePolicy(new PolicyStatement({
                actions: ['secretsmanager:GetSecretValue'],
                resources: [instance.secret.secretArn]
            }))

            Tag.add(appServer, 'RDS_Secret_Arn', instance.secret.secretArn.split(':')[0])

        }

        Tag.add(appServer, 'Role', 'WordpressServer')

        this.wordpressServer = appServer

    }


    private createWebAppRole() {


        return new Role(this, 'webAppRole', {
            assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
                ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
                ManagedPolicy.fromAwsManagedPolicyName('AWSCodeCommitReadOnly'),
                ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ReadOnlyAccess')
            ],
            roleName: `EC2-Role`
        });

    }


}
