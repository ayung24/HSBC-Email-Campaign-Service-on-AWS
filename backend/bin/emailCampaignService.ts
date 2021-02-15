#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { EmailCampaignServiceStack } from '../src/emailCampaignServiceStack';

const app = new cdk.App();
new EmailCampaignServiceStack(app, 'EmailCampaignServiceStack');
