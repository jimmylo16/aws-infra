import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
const path = require("path");
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
/**
 * This class create a lambda stack with the function
 * inside the service folder and add a apigateway to interact with that lambda
 */
export class LambdaStack extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const rootDomain = "soluntech.com";

    const zone = HostedZone.fromLookup(this, "baseZone", {
      domainName: rootDomain,
    });

    const handler = new lambda.Function(this, "getToken", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, "../service")),
      functionName: "get-helix-Token",
      handler: "handler.handler",
      environment: {
        [`TWIGLIO_APPKEY`]: process.env.TWIGLIO_APPKEY || "",
        [`CASPIO_TOKEN`]: process.env.CASPIO_TOKEN || "",
      },
      timeout: cdk.Duration.seconds(60),
    });

    const api = new apigateway.RestApi(this, "twilio-api", {
      restApiName: "Twilio service",
      description: "This service twilio functions.",
      domainName: {
        domainName: "lambda.soluntech.com",
        certificate: acm.Certificate.fromCertificateArn(
          this,
          "my-cert",
          process.env.QA_CERTIFICATE_ARN!
        ),
        endpointType: apigateway.EndpointType.REGIONAL,
      },
    });

    new ARecord(this, "SiteRecord test", {
      zone: zone,
      recordName: "lambda",
      target: RecordTarget.fromAlias(
        new cdk.aws_route53_targets.ApiGateway(api)
      ),
    });

    const getMethod = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' },
    });

    const caspio = api.root.addResource("caspio");
    caspio.addMethod("GET", getMethod); // GET /
    const twilio = api.root.addResource("twilio");
    twilio.addMethod("GET", getMethod); // GET /
  }
}
