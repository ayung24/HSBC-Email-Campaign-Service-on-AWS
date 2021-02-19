import { RequestService } from './requestService';
import { TemplateDisplay } from '../models/templateDisplay';

export class TemplateService {
    private _requestService: RequestService;

    constructor() {
        this._requestService = new RequestService();
    }

    public getTemplates(): Promise<any> {
        // Temp
        return new Promise<any>(resolve => {
            // Returns an error
            // throw new Error('error');
            // Returns list
            resolve([
                { id: '12345', name: 'Test Template', uploadTime: new Date(1412970153123) },
                { id: '1232', name: 'Test 2 Template', uploadTime: new Date(1612970153114) },
                { id: '12452', name: 'Test 3 Template', uploadTime: new Date(1611560133124) },
                { id: '13452', name: 'Test 4 Template', uploadTime: new Date(1616770153124) },
                { id: '23452', name: 'Test 5 Template', uploadTime: new Date(1510970153124) },
                { id: '1234123', name: 'Test 6 Template', uploadTime: new Date(1612970153124) },
                { id: '12312321', name: 'Test 7 Template', uploadTime: new Date(1612970153124) },
                { id: '875', name: 'Test 8 Template', uploadTime: new Date(612070153124) },
                { id: '58', name: 'Test 9 Template', uploadTime: new Date(652970153124) },
                { id: '587', name: 'Test 10 Template', uploadTime: new Date(121297053124) },
                { id: '5897', name: 'Test 2 Template', uploadTime: new Date(112970153124) },
                { id: '1342', name: 'Test 2 Template', uploadTime: new Date(11129701524) },
                { id: '5364', name: 'Test 2 Template', uploadTime: new Date(112970153124) },
                { id: '356', name: 'Test 2 Template', uploadTime: new Date(1012970153124) },
                { id: '36', name: 'Test 2 Template', uploadTime: new Date(92970153124) },
                { id: '53649', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '3654', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '5786', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '4635', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '78', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '786', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '567', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '576', name: 'Test Template', uploadTime: new Date(1612970153123) },
                { id: '2346', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '43', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '432', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '10', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '9', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '8', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '1293452', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '17452', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '1023452', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
                { id: '1238452', name: 'Test 2 Template', uploadTime: new Date(1612970153124) },
            ]);
        });
    }
}
