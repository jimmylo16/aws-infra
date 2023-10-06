import { StackProps } from "aws-cdk-lib";

export interface IAwsAmplifyStackProps extends StackProps {
  roleName: string;
  roleDesc: string;
  secretName: string;
  appName: string;
  appDomain: string;
  appDesc: string;
  gitOwner: string;
  gitRepo: string;
  gitProdBranch: string;
  gitDevBranch: string;
  twilioAppKey: string;
  account: string;
  region: string;
}

export interface IAWSS3Serverless extends StackProps {
  env: {
    account: string | undefined;
    region: string | undefined;
  };
  domainName: string;
  certificateArn: string;
  dev: IEnvironment;
  prod: IEnvironment;
  qa: IEnvironment;
}
export interface IEnvironment {
  bucketName: string;
  subDomain: string;
  certificateArn: string;
  domainName: string;
}
export type DistributionVariables = Omit<
  IAWSS3Serverless,
  "dev" | "prod" | "qa"
>;
