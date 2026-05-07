// Docker Compose-based helpers (recommended approach)
export { TestCompose } from './compose/docker-compose-cli';
export type { ComposeEnvironmentConfig } from './compose/docker-compose-cli';

// TestModuleBuilder (works with Docker Compose infrastructure)
export { TestModuleBuilder } from './fixtures/test-module-builder';
export type { TestModuleConfig } from './fixtures/test-module-builder';

// Helpers
export { clearDatabase } from './helpers/clear-database';

// Legacy Testcontainers exports (may not work on all platforms)
export { PostgresTestContainer } from './containers/postgres-container';
export { RabbitMQTestContainer } from './containers/rabbitmq-container';
export { RedisTestContainer } from './containers/redis-container';
export { awaitEvent } from './helpers/await-event';
export { globalSetup, globalTeardown } from './setup';
