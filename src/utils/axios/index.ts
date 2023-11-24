import { IncomingHttpHeaders } from 'http';
import { AxiosPromise, Method, AxiosInstance } from 'axios';
import { HTTPMethods } from '../interface';

export const methods: HTTPMethods = {
  GET: 'GET',
  PUT: 'PUT',
  PATCH: 'PATCH',
  POST: 'POST',
  DELETE: 'DELETE',
};

export default class APIGateway {
  public HTTPMethods: HTTPMethods = methods;
  public axiosInstance: AxiosInstance;

  public constructor(axiosIns: AxiosInstance) {
    this.axiosInstance = axiosIns;
  }

  public request<T>(
    method: Method = this.HTTPMethods.GET,
    url: string,
    params?: Record<string, unknown> | null,
    data?: Record<string, unknown> | string,
    extraHeaders?: IncomingHttpHeaders,
  ): AxiosPromise<T> {
    let headers = {};

    console.log(`${method}: ${url}`);
    if (extraHeaders) {
      headers = { ...headers, ...extraHeaders };
    }

    return this.axiosInstance.request({
      method,
      url,
      params,
      data,
      headers,
    });
  }
}
