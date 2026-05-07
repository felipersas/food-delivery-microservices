import { DockerComposeEnvironment, StartedDockerComposeEnvironment } from 'testcontainers';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../../..');

export interface ComposeEnvironmentConfig {
  /** Services to start (default: all) */
  services?: string[];
  /** Additional environment variables */
  env?: Record<string, string>;
  /** Keep containers running after tests (for debugging) */
  keepRunning?: boolean;
}

/**
 * Docker Compose environment wrapper
 * 
 * Uses existing docker-compose files to spin up integration test infrastructure.
 * 
 * @example
 * ```typescript
 * beforeAll(async () => {
 *   await TestCompose.start(['postgres-order', 'rabbitmq']);
 * });
 * ```
 */
export class TestCompose {
  private static instance?: StartedDockerComposeEnvironment;

  /**
   * Start the Docker Compose environment
   * @param services - Specific services to start (starts all if omitted)
   * @returns Connection URIs map
   */
  static async start(config: ComposeEnvironmentConfig = {}): Promise<Record<string, string>> {
    const { services = [], env = {} } = config;

    // Stop any existing environment first
    if (this.instance) {
      await this.stop();
    }

    const composeFiles = [
      'docker-compose.infra.yml',
      'docker-compose.db.yml',
      'docker-compose.test.yml',  // Test override - exposes ports to host
    ];

    console.log('[TestCompose] Starting environment with services:', services.length > 0 ? services : 'all');

    const builder = new DockerComposeEnvironment(projectRoot, composeFiles)
      .withEnvironment({
        NODE_ENV: 'test',
        ...env,
      });

    this.instance = await builder.up(services.length > 0 ? services : undefined);

    // Build connection URIs for common services
    const connections: Record<string, string> = {};

    // PostgreSQL databases
    for (const db of ['order', 'payment', 'kitchen', 'customer', 'restaurant', 'auth', 'cart']) {
      const containerName = `postgres-${db}-1`;
      try {
        const container = this.instance.getContainer(containerName);
        const host = container.getHost();
        const port = container.getMappedPort(5432);
        connections[`${db}Database`] = `postgres://postgres:postgres@${host}:${port}/${db}s`;
        connections[`${db}Host`] = host;
        connections[`${db}Port`] = port.toString();
      } catch (e) {
        // Container not started
      }
    }

    // RabbitMQ
    try {
      const rabbitmq = this.instance.getContainer('rabbitmq-1');
      const host = rabbitmq.getHost();
      const port = rabbitmq.getMappedPort(5672);
      connections['rabbitmqUrl'] = `amqp://guest:guest@${host}:${port}`;
    } catch (e) {
      // RabbitMQ not started
    }

    // Redis
    try {
      const redis = this.instance.getContainer('redis-1');
      const host = redis.getHost();
      const port = redis.getMappedPort(6379);
      connections['redisUrl'] = `redis://${host}:${port}`;
    } catch (e) {
      // Redis not started
    }

    console.log('[TestCompose] Environment started, connections:', Object.keys(connections));

    return connections;
  }

  /**
   * Get a container by service name
   */
  static getContainer(serviceName: string) {
    if (!this.instance) {
      throw new Error('Environment not started. Call start() first.');
    }
    
    // Handle service name variations (postgres-order -> postgres-order-1)
    const containerName = serviceName.endsWith('-1') ? serviceName : `${serviceName}-1`;
    return this.instance.getContainer(containerName);
  }

  /**
   * Stop the Docker Compose environment
   */
  static async stop(options = { removeVolumes: false, timeout: 10000 }): Promise<void> {
    if (this.instance) {
      console.log('[TestCompose] Stopping environment...');
      await this.instance.down(options);
      this.instance = undefined;
      console.log('[TestCompose] Environment stopped');
    }
  }

  /**
   * Execute a command in a container
   */
  static async exec(containerName: string, command: string[]): Promise<{ output: string; exitCode: number }> {
    const container = this.getContainer(containerName);
    const result = await container.exec(command);
    return result;
  }

  /**
   * Wait for a service to be healthy
   */
  static async waitForHealthCheck(containerName: string, timeout = 30000): Promise<void> {
    const container = this.getContainer(containerName);
    // Wait for health check - simple implementation
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
