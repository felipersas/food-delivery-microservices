import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';

export interface ProxyRequestOptions {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ProxyResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
}

@Injectable()
export class HttpProxyStrategy {
  async proxy<T = any>(options: ProxyRequestOptions): Promise<ProxyResponse<T>> {
    const { url, method, body, headers = {}, timeout = 5000 } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: any;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new BadRequestException({
          statusCode: response.status,
          message: (data as any)?.message || 'Service returned error',
          error: data,
        });
      }

      return {
        data: data as T,
        status: response.status,
        headers: response.headers as any,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new ServiceUnavailableException(`Service timeout after ${timeout}ms`);
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new ServiceUnavailableException(`Service unavailable: ${error.message}`);
    }
  }

  async get<T = any>(url: string, options?: Omit<ProxyRequestOptions, 'url' | 'method'>): Promise<ProxyResponse<T>> {
    return this.proxy<T>({ ...options, url, method: 'GET' });
  }

  async post<T = any>(url: string, body: any, options?: Omit<ProxyRequestOptions, 'url' | 'method' | 'body'>): Promise<ProxyResponse<T>> {
    return this.proxy<T>({ ...options, url, method: 'POST', body });
  }

  async put<T = any>(url: string, body: any, options?: Omit<ProxyRequestOptions, 'url' | 'method' | 'body'>): Promise<ProxyResponse<T>> {
    return this.proxy<T>({ ...options, url, method: 'PUT', body });
  }

  async patch<T = any>(url: string, body: any, options?: Omit<ProxyRequestOptions, 'url' | 'method' | 'body'>): Promise<ProxyResponse<T>> {
    return this.proxy<T>({ ...options, url, method: 'PATCH', body });
  }

  async delete<T = any>(url: string, options?: Omit<ProxyRequestOptions, 'url' | 'method'>): Promise<ProxyResponse<T>> {
    return this.proxy<T>({ ...options, url, method: 'DELETE' });
  }
}
