# Auth Service - Implementation Plan

## Bounded Context

**Responsibility**: Authentication and authorization for all system users.

## Ubiquitous Language

- **User**: Entity that can authenticate (customer, restaurant, delivery, admin)
- **Role**: Permission level in the system
- **AccessToken**: JWT token for authentication (15 min expiry)
- **RefreshToken**: Token for renewing access token (7 days expiry)
- **Session**: Active user session with device tracking

## Domain Model

### Aggregates

#### User (Root)
```typescript
class User extends AggregateRoot<string> {
  private email: Email;
  private password: HashedPassword;
  private roles: UserRole[];
  private status: UserStatus;
  private refreshTokens: RefreshToken[];
  private lastLoginAt?: Date;
  private createdAt: Date;
}
```

**State Transitions**:
```
PENDING → ACTIVE → SUSPENDED → INACTIVE
```

**Business Rules**:
- Email must be unique
- Password minimum 8 chars, must contain uppercase, lowercase, number
- Cannot login if not ACTIVE
- Max 5 active refresh tokens per user

### Value Objects

#### Email
```typescript
interface EmailProps {
  value: string;  // validated, lowercase
}
```

#### HashedPassword
```typescript
interface HashedPasswordProps {
  value: string;  // bcrypt hash
}
```

#### UserRole (Enum)
```typescript
enum UserRoleEnum {
  CUSTOMER = 'customer',
  RESTAURANT = 'restaurant',
  DELIVERY = 'delivery',
  ADMIN = 'admin',
}
```

#### UserStatus (Value Object with state machine)
```typescript
enum UserStatusEnum {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}
```

#### AccessToken
```typescript
interface AccessTokenProps {
  token: string;     // JWT signed
  expiresAt: Date;   // 15 minutes
}
```

#### RefreshToken
```typescript
interface RefreshTokenProps {
  token: string;     // random UUID
  expiresAt: Date;   // 7 days
  deviceId: string;  // device fingerprint
  createdAt: Date;
}
```

## Domain Events

| Event | Published By | Consumed By | Payload |
|-------|--------------|-------------|---------|
| `user.created` | User | Analytics | userId, email, roles |
| `user.activated` | User | Analytics | userId |
| `user.suspended` | User | All services | userId, reason |
| `user.logged-in` | User | Analytics | userId, deviceId |
| `user.logged-out` | User | Analytics | userId |

## API Endpoints

### Authentication
```
POST   /auth/register           # Register new user
POST   /auth/login              # Login (email + password)
POST   /auth/refresh            # Refresh access token
POST   /auth/logout             # Logout (invalidate refresh token)
```

### User Management
```
GET    /auth/me                 # Get current user profile
PUT    /auth/me                 # Update current user profile
PATCH  /auth/me/status          # Change status (admin only)
PATCH  /auth/me/roles           # Add/remove roles (admin only)
```

### Token Management
```
GET    /auth/tokens             # List active refresh tokens
DELETE /auth/tokens/:id         # Revoke refresh token
DELETE /auth/tokens             # Revoke all tokens (logout everywhere)
```

## Database Schema

### users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  last_login_at TIMESTAMP,
  version INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

### user_roles Table
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
```

### refresh_tokens Table
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

## Security Considerations

1. **Password hashing**: bcrypt with salt rounds >= 10
2. **JWT signing**: RS256 (asymmetric) or HS256 (symmetric)
3. **Token expiry**: Access token 15min, Refresh token 7 days
4. **Refresh token rotation**: New token on each refresh, old invalidated
5. **Rate limiting**: Login attempts (5 per minute per IP)
6. **Device tracking**: Store device ID for selective logout

## File Structure
```
packages/auth-service/
├── src/
│   ├── domain/
│   │   ├── aggregates/
│   │   │   └── user.aggregate.ts
│   │   ├── value-objects/
│   │   │   ├── email.vo.ts
│   │   │   ├── hashed-password.vo.ts
│   │   │   ├── user-role.vo.ts
│   │   │   ├── user-status.vo.ts
│   │   │   ├── access-token.vo.ts
│   │   │   └── refresh-token.vo.ts
│   │   └── repositories/
│   │       └── user.repository.interface.ts
│   ├── application/
│   │   ├── use-cases/
│   │   │   ├── register/
│   │   │   ├── login/
│   │   │   ├── refresh-token/
│   │   │   ├── logout/
│   │   │   ├── get-current-user/
│   │   │   ├── update-user/
│   │   │   ├── change-status/
│   │   │   └── revoke-tokens/
│   │   └── dto/
│   ├── infra/
│   │   ├── database/
│   │   │   ├── memory/
│   │   │   └── typeorm/
│   │   ├── http/
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   └── guards/
│   │   │       └── jwt.guard.ts
│   │   └── messaging/
│   │       └── rabbitmq/
│   ├── config/
│   ├── tokens.ts
│   ├── main.ts
│   └── auth.module.ts
└── package.json
```

## Configuration
```typescript
// environment
AUTH_PORT=3008
AUTH_DATABASE_URL=postgresql://postgres:postgres@localhost:5438/auth
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

// root package.json scripts
"dev:auth": "bun run --workspace packages/auth-service/src/main.ts",
"test:auth": "bun test --workspace packages/auth-service"
```

## Dependencies
```json
{
  "name": "auth-service",
  "dependencies": {
    "@app/shared": "workspace:*",
    "@app/messaging": "workspace:*",
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/throttler": "^5.0.0",
    "passport": "^0.6.0",
    "passport-jwt": "^4.0.0",
    "passport-local": "^1.0.0",
    "bcrypt": "^5.1.0",
    "typeorm": "^0.3.17",
    "uuid": "^9.0.0",
    "joi": "^17.9.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1"
  }
}
```

## Implementation Phases

### Phase 1: Core User (MVP)
- [ ] User aggregate + value objects
- [ ] RegisterUseCase
- [ ] LoginUseCase
- [ ] RefreshTokenUseCase
- [ ] LogoutUseCase
- [ ] AuthController (register, login, refresh, logout)
- [ ] In-memory + PostgreSQL repos
- [ ] JWT guard for protected routes

### Phase 2: User Management
- [ ] GetUserUseCase
- [ ] UpdateUserUseCase
- [ ] ChangeStatusUseCase
- [ ] ManageRolesUseCase
- [ ] UserController
- [ ] Admin-only endpoints

### Phase 3: Token Management
- [ ] ListTokensUseCase
- [ ] RevokeTokenUseCase
- [ ] RevokeAllTokensUseCase
- [ ] Token cleanup job (expired tokens)

### Phase 4: Security Features
- [ ] Rate limiting on login
- [ ] Device tracking
- [ ] Password reset flow
- [ ] Email verification
- [ ] 2FA (optional)

## Open Questions
1. **Multi-tenant?** Should restaurants have separate user management?
2. **OAuth?** Support Google/Facebook login?
3. **SSO?** Single sign-on across services?
4. **Password reset?** Email or SMS flow?
