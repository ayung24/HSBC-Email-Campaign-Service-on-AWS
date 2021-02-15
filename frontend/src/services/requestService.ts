import { API, Auth } from 'aws-amplify';
import { awsEndpoints } from '../awsEndpoints';

export class RequestService {
    private _endpoint = awsEndpoints.find(endpoint => endpoint.name === 'prod');
    private _apiName = this._endpoint?.name;

    public async GET(path: string): Promise<any> {
        const token = await this._getToken();
        const request = {
            headers: {
                Authorization: token,
            },
        };

        return API.get(this._apiName, path, request)
            .then(response => {
                console.log(response);
            })
            .catch(error => {
                console.log(error.response);
            });
    }

    private async _getToken(): Promise<string> {
        const user = await Auth.currentAuthenticatedUser();
        return user.signInUserSession.idToken.jwtToken;
    }
}
