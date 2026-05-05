# Multi-stage Dockerfile for NestJS/Bun microservices
FROM oven/bun:1.3-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json bun.lockb ./
COPY packages/shared packages/shared
COPY packages/messaging packages/messaging
RUN bun install --frozen-lockfile --production=false

# Production dependencies
FROM base AS prod-install
COPY package.json bun.lockb ./
COPY packages/shared packages/shared
COPY packages/messaging packages/messaging
RUN bun install --frozen-lockfile --production=true

# Development stage (with all dependencies)
FROM base AS dev
COPY --from=install /app/node_modules ./node_modules
COPY . .

# Production stage for specific service
FROM base AS prod
ARG SERVICE_NAME
COPY --from=prod-install /app/node_modules ./node_modules
COPY packages/shared packages/shared
COPY packages/messaging packages/messaging
COPY packages/${SERVICE_NAME} packages/${SERVICE_NAME}

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "packages/${SERVICE_NAME}/src/main.ts"]
