import { Injectable } from '@nestjs/common';
import type { UserContext } from './jwt.validator';
import { HttpProxyStrategy, type ProxyRequestOptions } from '../strategies/http-proxy.strategy';
import { buildUserContextHeaders } from './auth.interceptor';

/**
 * Auth-aware proxy strategy that forwards user context to microservices
 *
 * Wraps HttpProxyStrategy and automatically adds user context headers
 * to all downstream requests when a user is authenticated.
 */
@Injectable()
export class AuthProxyStrategy {
  constructor(private readonly httpProxy: HttpProxyStrategy) {}

  /**
   * Forward request with user context headers
   */
  async forward<T = any>(
    user: UserContext | null,
    options: ProxyRequestOptions,
  ): Promise<ReturnType<HttpProxyStrategy['proxy']>> {
    const headers = {
      ...options.headers,
    };

    // Add user context headers if user is authenticated
    if (user) {
      Object.assign(headers, buildUserContextHeaders(user));
    }

    return this.httpProxy.proxy<T>({
      ...options,
      headers,
    });
  }

  /**
   * GET request with user context
   */
  async get<T = any>(
    user: UserContext | null,
    url: string,
    options?: Omit<ProxyRequestOptions, 'url' | 'method'>,
  ) {
    return this.forward(user, { ...options, url, method: 'GET' });
  }

  /**
   * POST request with user context
   */
  async post<T = any>(
    user: UserContext | null,
    url: string,
    body: any,
    options?: Omit<ProxyRequestOptions, 'url' | 'method' | 'body'>,
  ) {
    return this.forward(user, { ...options, url, method: 'POST', body });
  }

  /**
   * PUT request with user context
   */
  async put<T = any>(
    user: UserContext | null,
    url: string,
    body: any,
    options?: Omit<ProxyRequestOptions, 'url' | 'method' | 'body'>,
  ) {
    return this.forward(user, { ...options, url, method: 'PUT', body });
  }

  /**
   * PATCH request with user context
   */
  async patch<T = any>(
    user: UserContext | null,
    url: string,
    body: any,
    options?: Omit<ProxyRequestOptions, 'url' | 'method' | 'body'>,
  ) {
    return this.forward(user, { ...options, url, method: 'PATCH', body });
  }

  /**
   * DELETE request with user context
   */
  async delete<T = any>(
    user: UserContext | null,
    url: string,
    options?: Omit<ProxyRequestOptions, 'url' | 'method'>,
  ) {
    return this.forward(user, { ...options, url, method: 'DELETE' });
  }
}
