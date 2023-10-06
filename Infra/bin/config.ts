import { IAWSS3Serverless, IAwsAmplifyStackProps } from "./types";

export const stackConfigAmplify: IAwsAmplifyStackProps = {
  roleName: "amplify-role",
  roleDesc: "role used for amplify",
  secretName: "github-token-jimmy-account",
  appName: "Twilio-jimmy",
  appDomain: "soluntech.com",
  appDesc: "amplify webshop",
  gitOwner: "jimmylo16",
  gitRepo: "twigglio-react",
  gitProdBranch: "master",
  gitDevBranch: "development",
  twilioAppKey: process.env.TWIGLIO_APPKEY || "",
  account: "482407636571",
  region: "us-west-1",
};

export const stackConfigS3: IAWSS3Serverless = {
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_DEFAULT_REGION,
  },
  dev: {
    bucketName: "twilio-helix-dev",
    subDomain: "",
    certificateArn: process.env.DEV_CERTIFICATE_ARN!,
    domainName: "dev.videong.helixvm.com",
  },
  qa: {
    bucketName: "twilio-helix-qa",
    subDomain: "qa-twilio",
    certificateArn: process.env.QA_CERTIFICATE_ARN!,
    domainName: "soluntech.com",
  },
  prod: {
    bucketName: "twilio-helix-prod",
    subDomain: "prod",
    certificateArn: "",
    domainName: "",
  },
  domainName: "videong.helixvm.com",
  certificateArn: process.env.APP_CERTIFICATE_ARN!,
};
