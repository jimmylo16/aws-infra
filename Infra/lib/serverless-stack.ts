import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dotenv from "dotenv";
import { LambdaStack } from "../helpers/lambda";
import { IAWSS3Serverless } from "../bin/types";
import { S3Service } from "../helpers/S3";
dotenv.config();
export class Serverless extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IAWSS3Serverless) {
    super(scope, id, props);

    new LambdaStack(this, "LambdaStack");

    new S3Service(this, "S3Service", props);

    // new AwsAmplifyStack(this, "S3Service", props);
  }
}
