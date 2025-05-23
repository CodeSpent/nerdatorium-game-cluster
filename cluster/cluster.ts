#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SatisfactoryGameServerStack } from './games/satisfactory/satisfactory.stack';
import { Config } from './config';

const app = new cdk.App();
// Register game stacks individually

/**
 * 
 * Satisfactory Game Stack
 * 
 */
new SatisfactoryGameServerStack(app, 'SatisfactoryGameServerStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  env: { account: Config.infrastructure.account, region: Config.infrastructure.region},

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

// TODO: Add Rust Game Stack
/**
 * 
 * Rust Game Stack
 * 
 */
// new RustGameServerStack(app, 'RustGameServerStack', {
//   /* If you don't specify 'env', this stack will be environment-agnostic.
//    * Account/Region-dependent features and context lookups will not work,
//    * but a single synthesized template can be deployed anywhere. */

//   /* Uncomment the next line to specialize this stack for the AWS Account
//    * and Region that are implied by the current CLI configuration. */
//   // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

//   /* Uncomment the next line if you know exactly what Account and Region you
//    * want to deploy the stack to. */
//   env: { account: Config.account, region: Config.region},

//   /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
// });
