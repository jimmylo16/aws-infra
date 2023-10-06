import { Stack, App, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  PublicHostedZone,
  ARecord,
  RecordTarget,
} from "aws-cdk-lib/aws-route53";
import {
  Vpc,
  InstanceType,
  SubnetType,
  Port,
  Peer,
  SecurityGroup,
} from "aws-cdk-lib/aws-ec2";
import { Role, ServicePrincipal, PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  TaskDefinition,
  Compatibility,
  EcsOptimizedImage,
  Cluster,
  AsgCapacityProvider,
  Ec2Service,
  LinuxParameters,
  ContainerImage,
  LogDriver,
  Protocol as ECSProtocol,
} from "aws-cdk-lib/aws-ecs";
import { AutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
  Protocol,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { LoadBalancerTarget } from "aws-cdk-lib/aws-route53-targets";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
export class VideoTwilioStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id, {
      env: {
        account: process.env.AWS_ACCOUNT_ID,
        region: process.env.AWS_DEFAULT_REGION,
      },
    });

    const repo = new Repository(this, "MyEcrRepo", {
      repositoryName: "my-ecr-repo",
      autoDeleteImages: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    repo.addLifecycleRule({ maxImageCount: 5 });

    const vpc = new Vpc(this, "AppVPC", {
      natGateways: 0,
    });

    /* Project Security Group */
    const securityGroup = new SecurityGroup(this, "SecurityGroup", {
      vpc,
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(22),
      "allow ssh access from the world"
    );

    const cluster = new Cluster(this, "Cluster", {
      vpc,
      clusterName: "video-twilio-cluster",
    });

    const taskRole = new Role(this, "AppRole", {
      assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    // Provide Cloudwatch
    taskRole.addToPolicy(
      new PolicyStatement({
        resources: ["*"],
        actions: ["logs:*", "cloudwatch:*"],
      })
    );

    const taskDefinition = new TaskDefinition(this, "AppTask", {
      taskRole,
      compatibility: Compatibility.EC2,
      // executionRole: new Role(this, "taskExecutionRole", {
      //   assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
      // }),
    });
    taskDefinition.obtainExecutionRole();

    const autoScalingGroup = new AutoScalingGroup(this, "autoScalingGroup", {
      instanceType: new InstanceType("t3.nano"),
      machineImage: EcsOptimizedImage.amazonLinux2(),
      associatePublicIpAddress: true,
      maxCapacity: 3,
      desiredCapacity: 0,
      minCapacity: 0,
      vpc: vpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      // securityGroup: securityGroup,
      newInstancesProtectedFromScaleIn: false,
    });

    const capacityProvider = new AsgCapacityProvider(
      this,
      "EC2CapacityProvider",
      {
        autoScalingGroup: autoScalingGroup,
        enableManagedScaling: true,
        enableManagedTerminationProtection: false,
        targetCapacityPercent: 100,
        capacityProviderName: "Video-twilio-AutoScalingGroup-provider",
        // canContainersAccessInstanceRole: true,
      }
    );

    cluster.addAsgCapacityProvider(capacityProvider);

    const service = new Ec2Service(this, "AppService", {
      taskDefinition,
      serviceName: "video-twilio-service",
      cluster,
      // desiredCount: 1,
      // assignPublicIp: true,
      // securityGroups: [securityGroup],

      // daemon: true,
      capacityProviderStrategies: [
        {
          capacityProvider: capacityProvider.capacityProviderName,
          weight: 1,
          base: 0,
        },
      ],
    });

    const container = taskDefinition.addContainer("AppContainer", {
      linuxParameters: new LinuxParameters(this, "AppLinuxParams"),
      // image: ContainerImage.fromEcrRepository(repo),
      image: ContainerImage.fromAsset("../Front"),
      logging: LogDriver.awsLogs({
        streamPrefix: "app",
        logRetention: RetentionDays.ONE_WEEK,
      }),
      environment: {
        NODE_ENV: "production",
      },
      memoryReservationMiB: 200,
    });

    container.addPortMappings({
      containerPort: 3000,
      hostPort: 3000,
      protocol: ECSProtocol.TCP,
    });

    const domainCertificate = Certificate.fromCertificateArn(
      this,
      "AppCertificate",
      process.env.APP_CERTIFICATE_ARN!
    );

    const loadBalancer = new ApplicationLoadBalancer(this, "AppLoadBalancer", {
      vpc,
      internetFacing: true,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
    });

    loadBalancer.addRedirect({
      sourcePort: 80,
      sourceProtocol: ApplicationProtocol.HTTP,
      targetPort: 443,
      targetProtocol: ApplicationProtocol.HTTPS,
    });

    loadBalancer.connections.allowToAnyIpv4(Port.allTcp(), "All Out");

    const listener = loadBalancer.addListener("Listener", {
      port: 443,
      certificates: [domainCertificate],
      protocol: ApplicationProtocol.HTTPS,
    });

    listener.addTargets("AppTarget", {
      healthCheck: {
        enabled: true,
        protocol: Protocol.HTTP,
      },
      port: 3000,
      deregistrationDelay: Duration.seconds(3) as any,
      protocol: ApplicationProtocol.HTTP,
      targets: [service],
    });

    loadBalancer.connections.allowFromAnyIpv4(
      Port.tcp(80),
      "Ingress HTTP internet"
    );
    loadBalancer.connections.allowFromAnyIpv4(
      Port.tcp(443),
      "Ingress HTTPS internet"
    );

    for (const subnet of vpc.publicSubnets as any) {
      autoScalingGroup.connections.allowFrom(
        Peer.ipv4(subnet.ipv4CidrBlock),
        Port.tcp(3000),
        "Ingress from ALB to App"
      );
    }

    const hostedZone = PublicHostedZone.fromLookup(this, "HostedZone", {
      domainName: "soluntech.com",
    });

    new ARecord(this, "AppARecord", {
      zone: hostedZone,
      target: RecordTarget.fromAlias(
        new LoadBalancerTarget(loadBalancer as any)
      ),
      recordName: "prod-twilio-jimmy",
    });
  }
}
