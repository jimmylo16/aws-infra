import { Construct } from "constructs";
import { CreateDistribution } from "./Distribution";
import { IAWSS3Serverless } from "../bin/types";

/**
 * This class can create a bucket and upload the current content of the out folder as static website
 */

export class S3Service extends Construct {
  constructor(scope: Construct, id: string, props: IAWSS3Serverless) {
    super(scope, id);

    const { dev, prod, qa, ...distributionVariables } = props;

    new CreateDistribution(this, qa, distributionVariables);
    // new CreateDistribution(this, prod, distributionVariables);
  }
}
