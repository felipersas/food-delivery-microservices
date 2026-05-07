import { PostgresTestContainer } from './containers/postgres-container';
import { RabbitMQTestContainer } from './containers/rabbitmq-container';
import { RedisTestContainer } from './containers/redis-container';

let setupComplete = false;

export async function globalSetup(): Promise<void> {
  if (setupComplete) return;

  console.log('🐳 Starting Testcontainers...');

  await Promise.all([
    PostgresTestContainer.start(),
    RabbitMQTestContainer.start(),
    RedisTestContainer.start(),
  ]);

  setupComplete = true;
  console.log('✅ Testcontainers ready');
}

export async function globalTeardown(): Promise<void> {
  if (!setupComplete) return;

  console.log('🛑 Stopping Testcontainers...');

  await Promise.all([
    PostgresTestContainer.stop(),
    RabbitMQTestContainer.stop(),
    RedisTestContainer.stop(),
  ]);

  setupComplete = false;
  console.log('✅ Testcontainers stopped');
}

export function isSetupComplete(): boolean {
  return setupComplete;
}
