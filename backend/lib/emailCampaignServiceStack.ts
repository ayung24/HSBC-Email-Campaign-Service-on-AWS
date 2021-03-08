import * as cdk from '@aws-cdk/core';
import * as apiGateway from '@aws-cdk/aws-apigateway';
import { TemplateService } from './services/templateService';
import { EmailService } from './services/emailService';
import { Database } from './constructs/database';
import { LogGroup, RetentionDays } from '@aws-cdk/aws-logs';
require('dotenv').config();

/**
 * Main backend stack
 */
export class EmailCampaignServiceStack extends cdk.Stack {
    private _database: Database;
    private _templateService: TemplateService;
    private _emailService: EmailService;

    private _api: apiGateway.RestApi;

    public static logGroupNamePrefix = '/aws/lambda/';

    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this._initApi();
        this._initLogGroups();

        this._database = new Database(this, 'EmailCampaignServiceDatabase');
        this._templateService = new TemplateService(this, this._api, this._database);
        this._emailService = new EmailService(this, this._api, this._database);
    }

    private _initApi(): void {
        this._api = new apiGateway.RestApi(this, 'RestApi', {
            defaultCorsPreflightOptions: {
                allowOrigins: apiGateway.Cors.ALL_ORIGINS,
            },
        });
    }

    /**
     * Initialize Amplify log groups to control log retention period
     */
    private _initLogGroups(): void {
        new LogGroup(this, `LoginLogs-${process.env.BUILD_ENV}`, {
            logGroupName: `/amplify/Login-${process.env.BUILD_ENV}`,
            retention: RetentionDays.SIX_MONTHS,
        });
        new LogGroup(this, `LogoutLogs-${process.env.BUILD_ENV}`, {
            logGroupName: `/amplify/Logout-${process.env.BUILD_ENV}`,
            retention: RetentionDays.SIX_MONTHS,
        });
    }
}
