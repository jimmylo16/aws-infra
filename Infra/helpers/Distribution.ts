import { RemovalPolicy } from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  CachePolicy,
  Distribution,
  OriginAccessIdentity,
} from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

import * as s3Deploy from "aws-cdk-lib/aws-s3-deployment";
import { DistributionVariables, IEnvironment } from "../bin/types";

export class CreateDistribution {
  distribution: Distribution;
  constructor(
    construct: Construct,
    environment: IEnvironment,
    AWSVariables: DistributionVariables
  ) {
    const { subDomain, bucketName, certificateArn, domainName } = environment;

    const bucket = new s3.Bucket(construct, "BucketID" + bucketName, {
      bucketName: bucketName,
      accessControl: s3.BucketAccessControl.PRIVATE,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const originAccessIdentity = new OriginAccessIdentity(
      construct,
      "OriginAccessIdentity" + subDomain
    );
    bucket.grantRead(originAccessIdentity);

    const zone = HostedZone.fromLookup(
      construct,
      "Zone" + subDomain + domainName,
      {
        domainName: domainName,
      }
    );
    const domainCertificate = Certificate.fromCertificateArn(
      construct,
      "AppCertificate" + subDomain + domainName,
      certificateArn
    );

    const distribution = new Distribution(
      construct,
      "Distribution" + subDomain + domainName,
      {
        defaultRootObject: "index.html",
        certificate: domainCertificate,
        domainNames: [domainName],
        defaultBehavior: {
          origin: new S3Origin(bucket, { originAccessIdentity }),
          cachePolicy: CachePolicy.CACHING_DISABLED,
        },
        errorResponses: [
          {
            httpStatus: 404,
            responsePagePath: "/index.html",
            responseHttpStatus: 404,
          },
        ],
      }
    );

    new ARecord(construct, "SiteRecord" + subDomain + domainName, {
      recordName: subDomain,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      zone,
    });

    // Deploy the current static files to aws
    new s3Deploy.BucketDeployment(construct, "S3Deploy" + bucketName, {
      sources: [s3Deploy.Source.asset("../Front/dist")],
      destinationBucket: bucket,
    });
  }
}
