#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { Serverless } from "../lib/serverless-stack";
import { stackConfigAmplify, stackConfigS3 } from "./config";
import { AwsAmplifyStack } from "../helpers/amplify-stack";
import { VideoTwilioStack } from "../lib/ECS-stack";

const app = new cdk.App();
new Serverless(app, "ServerlessStack", stackConfigS3);

// new VideoTwilioStack(app, "VideoTwilioStack");
// new AwsAmplifyStack(app, "InfraStack", stackConfig);
