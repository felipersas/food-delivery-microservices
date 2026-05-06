/**
 * Auth module exports
 *
 * Provides authentication and authorization components for API Gateway
 */

export { JwtValidator, type UserContext, type JwtPayload } from './jwt.validator';
export { extractJwtFromHeader } from './jwt.extractor';
export { AuthInterceptor, USER_CONTEXT_HEADERS, buildUserContextHeaders } from './auth.interceptor';
export { PublicRoute, IS_PUBLIC_ROUTE } from './public-route.decorator';
export { Roles, ROLES_KEY } from './roles.decorator';
export { AuthProxyStrategy } from './auth-proxy.strategy';
