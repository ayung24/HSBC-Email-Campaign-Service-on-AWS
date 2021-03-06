import * as cdk from '@aws-cdk/core';
import * as apiGateway from '@aws-cdk/aws-apigateway';
import { TemplateService } from './services/templateService';
import { EmailService } from './services/emailService';
import { Database } from './constructs/database';
import { LogGroup, RetentionDays } from '@aws-cdk/aws-logs';
import { ResponseType } from '@aws-cdk/aws-apigateway';

/**
 * Main backend stack
 */
export class EmailCampaignServiceStack extends cdk.Stack {
    private readonly _buildEnv: string;
    private _database: Database;
    private _templateService: TemplateService;
    private _emailService: EmailService;

    private _api: apiGateway.RestApi;

    private readonly REMOVAL_POLICY: cdk.RemovalPolicy;

    public static logGroupNamePrefix = '/aws/lambda/';

    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        this._buildEnv = this.node.tryGetContext('BUILDENV');
        this.REMOVAL_POLICY = this._buildEnv === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN;

        this._initApi();
        this._initLogGroups();

        this._database = new Database(this, 'EmailCampaignServiceDatabase', this._buildEnv);
        this._templateService = new TemplateService(this, this._api, this._database, this._buildEnv);
        this._emailService = new EmailService(this, this._api, this._database, this._buildEnv);
    }

    private _initApi(): void {
        const headers = apiGateway.Cors.DEFAULT_HEADERS;
        headers.push('APIKey');
        this._api = new apiGateway.RestApi(this, 'RestApi', {
            defaultCorsPreflightOptions: {
                allowOrigins: apiGateway.Cors.ALL_ORIGINS,
                allowHeaders: headers,
            },
        });
        this._api.addGatewayResponse('Unauthorized', {
            type: ResponseType.UNAUTHORIZED,
            responseHeaders: {
                'Access-Control-Allow-Origin': "'*'",
                'Access-Control-Allow-Headers': "'*'",
            },
            templates: {
                'application/json':
                    '{ "message": "Authorization error. Check your chosen template exists, or API key is correct for the chosen template.", "statusCode": "401" }',
            },
        });
        this._api.addGatewayResponse('Default_4XX', {
            type: ResponseType.DEFAULT_4XX,
            responseHeaders: {
                'Access-Control-Allow-Origin': "'*'",
                'Access-Control-Allow-Headers': "'*'",
            },
        });
    }

    /**
     * Initialize Amplify log groups to control log retention period
     */
    private _initLogGroups(): void {
        new LogGroup(this, `LoginLogs`, {
            logGroupName: `/amplify/Login-${this._buildEnv}`,
            retention: RetentionDays.SIX_MONTHS,
            removalPolicy: this.REMOVAL_POLICY,
        });
        new LogGroup(this, `LogoutLogs`, {
            logGroupName: `/amplify/Logout-${this._buildEnv}`,
            retention: RetentionDays.SIX_MONTHS,
            removalPolicy: this.REMOVAL_POLICY,
        });
    }
}
