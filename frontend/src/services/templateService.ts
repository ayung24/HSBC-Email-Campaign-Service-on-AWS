import { RequestService } from './requestService';

export class TemplateService {
    private _requestService: RequestService;

    constructor() {
        this._requestService = new RequestService();
    }

    public getTemplates(): Promise<any> {
        return this._requestService.GET('/helloWorld');
    }
}
