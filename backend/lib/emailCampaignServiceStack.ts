import * as cdk from '@aws-cdk/core';
import * as apiGateway from '@aws-cdk/aws-apigateway';
import { TemplateService } from './services/templateService';
import { EmailService } from './services/emailService';
import { DatabaseService } from './services/databaseService';

/**
 * Main backend stack
 */
export class EmailCampaignServiceStack extends cdk.Stack {
    private _databaseService: DatabaseService;
    private _templateService: TemplateService;
    private _emailService: EmailService;

    private _api: apiGateway.RestApi;

    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        this._initApi();
        
        this._databaseService = new DatabaseService(this);
        this._templateService = new TemplateService(this, this._api, this._databaseService);
        this._emailService = new EmailService(this, this._api);
    }

    private _initApi(): void {
        this._api = new apiGateway.RestApi(this, 'RestApi', {
            defaultCorsPreflightOptions: {
                allowOrigins: apiGateway.Cors.ALL_ORIGINS,
            },
        });
    }
}
