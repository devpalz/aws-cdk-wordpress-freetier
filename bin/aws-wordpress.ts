#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import 'source-map-support/register';
import { WordpressBackup } from '../lib/wordpress-backup';
import { WordpressComputeStack } from '../lib/wordpress-compute';
import { WordpressAlbStack } from '../lib/wordpress-loadbalancer';
import { WordpressVpc } from '../lib/wordpress-vpc';

const app = new cdk.App();
const vpcStack = new WordpressVpc(app, 'Wordpress-Vpc');
const computeStack = new WordpressComputeStack(app, 'Wordpress-Compute', { vpc: vpcStack.vpc })

new WordpressAlbStack(app, 'Wordpress-Load-Balancer',
    {
        vpc: vpcStack.vpc,
        wordpressServer: computeStack.wordpressServer,
        wordpressServerClientSg: computeStack.wordpressServerClientSg,
        description: 'Deploys the ALB which will serve traffic to our EC2 instance running WordPress'
    })


new WordpressBackup(app, 'Wordpress-Backup', {
    terminationProtection: true,
    description: 'Deploys the S3 Bucket and IAM user to use to create Wordpress Backups'
})