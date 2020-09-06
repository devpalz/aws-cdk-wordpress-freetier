import { Stack, Construct, StackProps, RemovalPolicy } from "@aws-cdk/core";
import { AclCidr, AclTraffic, Action, GatewayVpcEndpointAwsService, NetworkAcl, NetworkAclEntry, SubnetType, TrafficDirection, Vpc, InterfaceVpcEndpointAwsService } from "@aws-cdk/aws-ec2";
import { Role } from "@aws-cdk/aws-iam";
import { LogGroup, RetentionDays } from "@aws-cdk/aws-logs";
import * as cdk from '@aws-cdk/core';
import { Tag } from '@aws-cdk/core';
import ec2 = require("@aws-cdk/aws-ec2");
import { IVpc, SecurityGroup, ISecurityGroup, Peer, Port } from "@aws-cdk/aws-ec2";
import iam = require("@aws-cdk/aws-iam");
import logs = require("@aws-cdk/aws-logs");

/**
 * For now, there is no Management VPC so no Transit Gateway to route all Internet connections through 1 IGW
 */
export class WordpressVpc extends Stack {

    vpc: IVpc


    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props)

        const vpc = this.createVpc('10.202.0.0/16', id);


        this.vpc = vpc

    }



    private createVpc(pCIDR: string, pVpcName: string) {


        const flowLogGroup: logs.ILogGroup = new LogGroup(this, 'prodLogGroup', {
            logGroupName: this.stackName, removalPolicy: RemovalPolicy.DESTROY, retention: RetentionDays.ONE_DAY  // Small retention for free tier
        })


        const vpc = new ec2.Vpc(this, 'rVpc', {
            cidr: pCIDR,
            maxAzs: 2,
            natGateways: 0, // No NAT Gateways because they cost
            subnetConfiguration: [
                {
                    subnetType: SubnetType.PUBLIC, // Free tier EC2 will go here and Free tier RDS too
                    name: "Public"
                }
            ],
            flowLogs: {
                vpcRejectFlowLogs: {
                    trafficType: ec2.FlowLogTrafficType.REJECT,
                    destination: ec2.FlowLogDestination.toCloudWatchLogs(flowLogGroup),
                }
            }
        });
        vpc.node.addDependency(flowLogGroup) // Make sure that the VPC is fully deleted before deleting the log group

        Tag.add(vpc, 'Name', pVpcName)



        return vpc;
    }



}