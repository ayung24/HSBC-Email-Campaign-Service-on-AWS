import { API, Auth } from 'aws-amplify';
import { awsEndpoints } from '../awsEndpoints';

export class RequestService {
    private _endpoint = awsEndpoints.find(endpoint => endpoint.name === 'prod');
    private _apiName = this._endpoint?.name;

    public GET<T>(path: string, handler: (r: any) => Promise<T>): Promise<T> {
        return RequestService._getToken()
            .then((token: string) => {
                const request = {
                    headers: {
                        Authorization: token,
                    },
                };
                return API.get(this._apiName, path, request);
            })
            .then(response => handler(response));
    }

    public POST<T>(path: string, params: any, handler: (r: any) => Promise<T>): Promise<T> {
        return RequestService._getToken()
            .then((token: string) => {
                const request = {
                    headers: {
                        Authorization: token,
                    },
                    body: params,
                };
                return API.post(this._apiName, path, request);
            })
            .then(response => handler(response));
    }

    public PUT<T>(path: string, params: any, handler: (r: any) => Promise<T>): Promise<T> {
        return RequestService._getToken()
            .then((token: string) => {
                const request = {
                    headers: {
                        Authorization: token,
                    },
                    body: params,
                };
                return API.put(this._apiName, path, request);
            })
            .then(response => handler(response));
    }

    public DELETE<T>(path: string, handler: (r: any) => Promise<T>): Promise<T> {
        return RequestService._getToken()
            .then((token: string) => {
                const request = {
                    headers: {
                        Authorization: token,
                    },
                };
                return API.del(this._apiName, path, request);
            })
            .then(response => handler(response));
    }

    public EMAIL<T>(path: string, apiKey: string, params: any, handler: (r: any) => Promise<T>): Promise<T> {
        const request = {
            headers: {
                APIKey: apiKey,
            },
            body: params,
        };
        return API.post(this._apiName, path, request).then(response => handler(response));
    }

    private static _getToken(): Promise<string> {
        return Auth.currentAuthenticatedUser().then(user => user.signInUserSession.idToken.jwtToken);
    }
}
