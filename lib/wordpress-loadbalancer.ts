import { Certificate, CertificateValidation } from "@aws-cdk/aws-certificatemanager";
import { Instance, IVpc, SecurityGroup, SubnetType } from "@aws-cdk/aws-ec2";
import { ApplicationLoadBalancer, ApplicationProtocol, CfnLoadBalancer, InstanceTarget, ListenerAction, Protocol } from '@aws-cdk/aws-elasticloadbalancingv2';
import { ARecord, HostedZone, RecordTarget } from "@aws-cdk/aws-route53";
import { LoadBalancerTarget } from "@aws-cdk/aws-route53-targets";
import { Construct, Fn, Stack, StackProps } from "@aws-cdk/core";


export interface WordpressAlbStackProps extends StackProps {
    vpc: IVpc,
    wordpressServer: Instance
    wordpressServerClientSg: SecurityGroup
}


export class WordpressAlbStack extends Stack {


    constructor(scope: Construct, id: string, props: WordpressAlbStackProps) {
        super(scope, id, props)

        const albSg = new SecurityGroup(this, 'albSg', {
            vpc: props.vpc,
            allowAllOutbound: true,
            description: "Security group for our public Application Load Balancer",
        });


        const alb = new ApplicationLoadBalancer(this, 'publicAlb', {
            vpc: props.vpc,
            internetFacing: true,
            vpcSubnets: props.vpc.selectSubnets({ subnetType: SubnetType.PUBLIC }),
            loadBalancerName: "public-alb",
            securityGroup: albSg
        })
        const cfnElb = alb.node.defaultChild as CfnLoadBalancer
        cfnElb.addPropertyOverride("SecurityGroups", [albSg.securityGroupId, Fn.importValue('clientEc2SgId')])




        const zone = HostedZone.fromHostedZoneAttributes(this, 'devpalzhostedzone',
            {
                hostedZoneId: 'Z0027986F05UKH8C4ABU', zoneName: 'devpalz.com'
            })

        // Create a certificate that is valid for all subdomains
        const certForAll = new Certificate(this, 'Certificate', {
            domainName: '*.devpalz.com',
            validation: CertificateValidation.fromDns(zone),
        });

        // Create an A record in our hosted zone, and associate it with the domain pre-prod.devpalz.com
        new ARecord(this, 'ARecord', {
            zone,
            target: RecordTarget.fromAlias(new LoadBalancerTarget(alb)),
            recordName: 'test'
        });

        // If anyone tries to access on port 80, redirect them to 443
        alb.addListener('inseucreListener', {
            port: 80,
            defaultAction: ListenerAction.redirect({ port: '443' })
        })


        const listener = alb.addListener('secureListener', {
            port: 443,
            certificates: [certForAll],
            open: true
        })


        listener.addTargets('wordpress', {
            targets: [new InstanceTarget(props.wordpressServer.instanceId)],
            targetGroupName: 'wordpress-instances',
            protocol: ApplicationProtocol.HTTP,
            port: 80,
            healthCheck: {
                path: '/',
                protocol: Protocol.HTTP,
                unhealthyThresholdCount: 3
            }
        })
    }


}