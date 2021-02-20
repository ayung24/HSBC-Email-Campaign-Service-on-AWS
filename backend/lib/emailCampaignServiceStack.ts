import * as cdk from '@aws-cdk/core';
import * as apiGateway from '@aws-cdk/aws-apigateway';
import { TemplateService } from './services/templateService';
import { EmailService } from './services/emailService';
import { DataStore } from './dataStore';

/**
 * Main backend stack
 */
export class EmailCampaignServiceStack extends cdk.Stack {
    private _templateService: TemplateService;
    private _emailService: EmailService;
    private _dataStore: DataStore;

    private _api: apiGateway.RestApi;

    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this._dataStore = new DataStore(this, 'DataStore');

        this._initApi();
        this._templateService = new TemplateService(this, this._api, this._dataStore);
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
