import * as cdk from '@aws-cdk/core';

import * as lambda from "@aws-cdk/aws-lambda";
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import { Secret } from '@aws-cdk/aws-secretsmanager';
import { ManagedKafkaEventSource } from '@aws-cdk/aws-lambda-event-sources';
import {Duration} from '@aws-cdk/core';

export class KafkaConsumerLambdaCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'msk', {vpcId: "vpc-0ce8ea63163195679"});
    const sg = ec2.SecurityGroup.fromLookup(this, 'sg', 'sg-032a7043cb392f735');
    const mskCluster = 'arn:aws:kafka:eu-west-1:735181371616:cluster/msk/884ed7c0-f157-4bb7-8da4-6acfdb2e29ba-3';
    const topic = 'TestTopic';
    const timeout = 30;
    const secret = Secret.fromSecretCompleteArn(this, 'Secret', 'arn:aws:secretsmanager:eu-west-1:735181371616:secret:AmazonMSK_Secret_new-wLBjAE');

    const secretsDescribePolicy = new iam.PolicyStatement({
      actions: [
        "secretsmanager:DescribeSecret",
        "secretsmanager:GetSecretValue",
        "secretsmanager:ListSecretVersionIds",
        "secretsmanager:GetResourcePolicy"
      ],
      resources: ['arn:aws:secretsmanager:eu-west-1:735181371616:secret:AmazonMSK_Secret_new-wLBjAE']
    });

    const kmsPolicy = new iam.PolicyStatement({
      actions: [
        "kms:Decrypt"
      ],
      resources: ['arn:aws:kms:*']
    });

    const listScramSecretPolicy = new iam.PolicyStatement({
      actions: [
        "kafka:ListScramSecrets"
      ],
      resources: ['*']
    });

    const customRole = new iam.Role(this, 'lamdaRole', {
      roleName: 'lambdaRole',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"),
          iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
          iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaMSKExecutionRole"),  
      ],
  });

  customRole.addToPolicy(secretsDescribePolicy);
  customRole.addToPolicy(kmsPolicy);
  customRole.addToPolicy(listScramSecretPolicy);

    const handler = new lambda.Function(this, "KafkaConsumer", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("resources"),
      handler: "index.handler",
      vpc,
      role: customRole,
      timeout: Duration.seconds(timeout),
      securityGroups: [sg], 
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE
      }
    });

    handler.addEventSource(new ManagedKafkaEventSource({
      clusterArn: mskCluster,
      topic,
      secret,
      batchSize: 100,
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    }));

  }
}
