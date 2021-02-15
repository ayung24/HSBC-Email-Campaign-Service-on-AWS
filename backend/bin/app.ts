#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { EmailCampaignServiceStack } from '../lib/emailCampaignServiceStack';

const app = new cdk.App();
new EmailCampaignServiceStack(app, 'AppStack');
