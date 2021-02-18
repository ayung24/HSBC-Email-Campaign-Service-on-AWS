import { RequestService } from './requestService';

export class TemplateService {
    private _requestService: RequestService;

    constructor() {
        this._requestService = new RequestService();
    }

    public getTemplates(): Promise<any> {
        // return this._requestService.GET('/helloWorld');

        // Temp
        return new Promise<any>(resolve => {
            resolve([
                { TemplateID: '12345', Name: 'Test Template', TimeCreated: 1412970153123 },
                { TemplateID: '1232', Name: 'Test 2 Template', TimeCreated: 1612970153114 },
                { TemplateID: '12452', Name: 'Test 3 Template', TimeCreated: 1611560133124 },
                { TemplateID: '13452', Name: 'Test 4 Template', TimeCreated: 1616770153124 },
                { TemplateID: '23452', Name: 'Test 5 Template', TimeCreated: 1510970153124 },
                { TemplateID: '1234123', Name: 'Test 6 Template', TimeCreated: 1612970153124 },
                { TemplateID: '12312321', Name: 'Test 7 Template', TimeCreated: 1612970153124 },
                { TemplateID: '875', Name: 'Test 8 Template', TimeCreated: 612070153124 },
                { TemplateID: '58', Name: 'Test 9 Template', TimeCreated: 652970153124 },
                { TemplateID: '587', Name: 'Test 10 Template', TimeCreated: 112970153124 },
                { TemplateID: '5897', Name: 'Test 2 Template', TimeCreated: 121297053124 },
                { TemplateID: '1342', Name: 'Test 2 Template', TimeCreated: 11129701524 },
                { TemplateID: '5364', Name: 'Test 2 Template', TimeCreated: 112970153124 },
                { TemplateID: '356', Name: 'Test 2 Template', TimeCreated: 1012970153124 },
                { TemplateID: '36', Name: 'Test 2 Template', TimeCreated: 92970153124 },
                { TemplateID: '53649', Name: 'Test 2 Template', TimeCreated: 1612970153124 },
                { TemplateID: '3654', Name: 'Test 2 Template', TimeCreated: 1612970153124 },
                { TemplateID: '5786', Name: 'Test 2 Template', TimeCreated: 1612970153124 },
                { TemplateID: '4635', Name: 'Test 2 Template', TimeCreated: 1612970153124 },
                { TemplateID: '78', Name: 'Test 2 Template', TimeCreated: 1612970153124 },
                { TemplateID: '786', Name: 'Test 2 Template', TimeCreated: 1612970153124 },
                { TemplateID: '567', Name: 'Test 2 Template', TimeCreated: 1612970153124 },
                { TemplateID: '576', Name: 'Test Template', TimeCreated: 1612970153123 },
                { TemplateID: '2346', Name: 'Test 2 Template', TimeCreated: 1612970153124 },
                { TemplateID: '43', Name: 'Test 2 Template', TimeCreated: 1612970153124 },
                { TemplateID: '432', Name: 'Test 2 Template', TimeCreated: 1612970153124 },
                { TemplateID: '10', Name: 'Test 2 Template', TimeCreated: 1612970153124 },
                { TemplateID: '9', Name: 'Test 2 Template', TimeCreated: 1612970153124 },
                { TemplateID: '8', Name: 'Test 2 Template', TimeCreated: 1612970153124 },
                { TemplateID: '1293452', Name: 'Test 2 Template', TimeCreated: 1612970153124 },
                { TemplateID: '17452', Name: 'Test 2 Template', TimeCreated: 1612970153124 },
                { TemplateID: '1023452', Name: 'Test 2 Template', TimeCreated: 1612970153124 },
                { TemplateID: '1238452', Name: 'Test 2 Template', TimeCreated: 1612970153124 },
            ]);
        });
    }
}
