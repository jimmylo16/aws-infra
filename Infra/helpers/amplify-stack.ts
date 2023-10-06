import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import * as iam from "aws-cdk-lib/aws-iam";
import * as amplify from "@aws-cdk/aws-amplify-alpha";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from "aws-cdk-lib/custom-resources";
import { IAwsAmplifyStackProps } from "../bin/types";
// import { NagSuppressions } from "cdk-nag";

export class AwsAmplifyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IAwsAmplifyStackProps) {
    super(scope, id, props);

    const role = new iam.Role(this, "Role", {
      roleName: props.roleName,
      description: props.roleDesc,
      assumedBy: new iam.ServicePrincipal("amplify.amazonaws.com"),
    });
    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess-Amplify")
    );

    // get github token from secret manager
    const secret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "githubSecret",
      props.secretName
    );
    secret.grantRead(role);

    // buildspecs for next.js static website
    const buildSpec = codebuild.BuildSpec.fromObjectToYaml({
      version: "1.0",
      frontend: {
        phases: {
          preBuild: { commands: ["npm ci"] },
          build: { commands: ["npm run build"] },
        },
        artifacts: {
          baseDirectory: ".next",
          files: ["**/*"],
        },
        cache: {},
      },
    });

    // amplify app from github repository
    const amplifyApp = new amplify.App(this, "HelixAmplify", {
      appName: props.appName,
      description: props.appDesc,
      role,
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: props.gitOwner,
        repository: props.gitRepo,
        oauthToken: secret.secretValueFromJson("secret"),
      }),
      autoBranchCreation: {
        autoBuild: true,
        patterns: [props.gitProdBranch],
      },
      autoBranchDeletion: true,
      buildSpec,
      environmentVariables: {
        TWIGLIO_APPKEY: props.twilioAppKey,
      },
    });

    this.addCustomRueles(amplifyApp);

    const master = amplifyApp.addBranch("master", {
      autoBuild: true,
      branchName: props.gitProdBranch,
      stage: "PRODUCTION",
    });
    const development = amplifyApp.addBranch("development", {
      autoBuild: true,
      branchName: props.gitDevBranch,
      stage: "DEVELOPMENT",
    });
    amplifyApp.addEnvironment("TWIGLIO_APPKEY", props.twilioAppKey);

    const domain = amplifyApp.addDomain("DomainName", {
      domainName: props.appDomain,
    });
    domain.mapRoot(master);
    domain.mapSubDomain(master, "prod-twiglio");
    domain.mapRoot(development);
    domain.mapSubDomain(development, "dev-twiglio");

    const setPlatform = new AwsCustomResource(this, "AmplifySetPlatform", {
      onUpdate: {
        service: "Amplify",
        action: "updateApp",
        parameters: {
          appId: amplifyApp.appId,
          platform: "WEB_COMPUTE",
        },
        physicalResourceId: PhysicalResourceId.of(
          "AmplifyCustomResourceSetPlatform"
        ),
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: [amplifyApp.arn],
      }),
    });
    setPlatform.node.addDependency(domain);

    const setFramework = new AwsCustomResource(this, "AmplifySetFramework", {
      onUpdate: {
        service: "Amplify",
        action: "updateBranch",
        parameters: {
          appId: amplifyApp.appId,
          branchName: "master",
          framework: "Next.js - SSR",
        },
        physicalResourceId: PhysicalResourceId.of(
          "AmplifyCustomResourceSetPlatform"
        ),
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE, // This allows actions on any resource
      }),
    });
    setFramework.node.addDependency(domain);

    // NagSuppressions.addStackSuppressions(this, [
    //   { id: "AwsSolutions-IAM4", reason: "Using Amplify AWS Managed Policy." },
    //   { id: "AwsSolutions-IAM5", reason: "Wildcard in AWS Managed Policy." },
    //   {
    //     id: "CdkNagValidationFailure",
    //     reason: "Custom resource uses other node version.",
    //   },
    //   {
    //     id: "AwsSolutions-L1",
    //     reason: "Custom resource uses other node version.",
    //   },
    // ]);
  }

  addCustomRueles(amplifyApp: amplify.App) {
    amplifyApp.addCustomRule({
      source: "/<*>",
      target: "/index.html",
      status: amplify.RedirectStatus.NOT_FOUND,
    });
    amplifyApp.addCustomRule({
      source: "/_next/<*>",
      target: "/_next/<*>",
      status: amplify.RedirectStatus.REWRITE,
    });
    amplifyApp.addCustomRule({
      source: "/static/<*>",
      target: "/static/<*>",
      status: amplify.RedirectStatus.REWRITE,
    });
    amplifyApp.addCustomRule({
      source:
        "</^[^.]+$|.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|ttf|map|json)$)([^.]+$)/>",
      target: "/index.html",
      status: amplify.RedirectStatus.NOT_FOUND,
    });
  }
}
