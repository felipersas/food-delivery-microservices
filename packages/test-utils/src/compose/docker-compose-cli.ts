import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

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
 * Docker Compose environment wrapper using CLI
 *
 * Uses docker compose CLI to spin up integration test infrastructure.
 * More reliable than Testcontainers on some platforms.
 */
export class TestCompose {
  private static started = false;

  /**
   * Start the Docker Compose environment
   * @param config - Configuration options
   * @returns Connection URIs map
   */
  static async start(config: ComposeEnvironmentConfig = {}): Promise<Record<string, string>> {
    const { services = [], env = {} } = config;

    if (this.started) {
      return this.getConnections();
    }

    const composeFiles = [
      '-f', 'docker-compose.infra.yml',
      '-f', 'docker-compose.db.yml',
      '-f', 'docker-compose.test.yml',
    ];

    const serviceArgs = services.length > 0 ? services : [];

    console.log('[TestCompose] Starting Docker Compose with services:', serviceArgs.length > 0 ? serviceArgs : 'all');

    try {
      const { stdout, stderr } = await execAsync(
        `docker compose ${composeFiles.join(' ')} up -d ${serviceArgs.join(' ')}`,
        {
          cwd: projectRoot,
          env: { ...process.env, NODE_ENV: 'test', ...env },
        }
      );

      if (stderr) {
        console.log('[TestCompose] Docker Compose stderr:', stderr);
      }

      console.log('[TestCompose] Containers started');

      // Wait for services to be healthy
      await this.waitForServices(services.length > 0 ? services : ['postgres-order', 'rabbitmq']);

      this.started = true;
      return this.getConnections();
    } catch (error) {
      console.error('[TestCompose] Failed to start:', error);
      throw error;
    }
  }

  /**
   * Get connection URIs for running containers
   */
  private static getConnections(): Record<string, string> {
    return {
      orderDatabase: 'postgres://postgres:postgres@localhost:5432/orders',
      paymentDatabase: 'postgres://postgres:postgres@localhost:5433/payments',
      kitchenDatabase: 'postgres://postgres:postgres@localhost:5434/kitchen',
      customerDatabase: 'postgres://postgres:postgres@localhost:5436/customers',
      restaurantDatabase: 'postgres://postgres:postgres@localhost:5437/restaurants',
      authDatabase: 'postgres://postgres:postgres@localhost:5438/auth',
      cartDatabase: 'postgres://postgres:postgres@localhost:5439/carts',
      rabbitmqUrl: 'amqp://guest:guest@localhost:5672',
      redisUrl: 'redis://localhost:6379',
    };
  }

  /**
   * Wait for services to be healthy
   */
  private static async waitForServices(services: string[]): Promise<void> {
    console.log('[TestCompose] Waiting for services to be healthy...');

    // Wait for PostgreSQL services
    for (const service of services) {
      if (service.startsWith('postgres-')) {
        await this.waitForPostgres(service);
      }
    }

    // Wait for RabbitMQ if included
    if (services.includes('rabbitmq')) {
      await this.waitForRabbitMQ();
    }

    console.log('[TestCompose] All services healthy');
  }

  private static async waitForPostgres(service: string): Promise<void> {
    const maxAttempts = 60; // Increased from 30 to 60 seconds
    const containerName = `food-delivery-microservices-${service}-1`;

    console.log(`[TestCompose] Waiting for ${service} (${containerName}) to be ready...`);

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const { stdout } = await execAsync(
          `docker exec ${containerName} pg_isready -U postgres`,
          { timeout: 5000 }
        );

        if (stdout.includes('accepting connections')) {
          console.log(`[TestCompose] ${service} is ready`);
          return;
        }
      } catch {
        // Service not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Timeout waiting for ${service} to be healthy`);
  }

  private static async waitForRabbitMQ(): Promise<void> {
    const maxAttempts = 60; // Increased from 30

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch('http://localhost:15672/api/overview', {
          headers: {
            'Authorization': 'Basic ' + Buffer.from('guest:guest').toString('base64'),
          },
        });

        if (response.ok) {
          console.log('[TestCompose] RabbitMQ is ready');
          return;
        }
      } catch {
        // RabbitMQ not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Timeout waiting for RabbitMQ to be healthy');
  }

  /**
   * Execute a command in a container
   */
  static async exec(containerName: string, command: string[]): Promise<{ output: string; exitCode: number }> {
    const container = containerName.endsWith('-1') ? containerName : `${containerName}-1`;

    try {
      const { stdout, stderr } = await execAsync(
        `docker exec ${container} ${command.join(' ')}`,
        { timeout: 10000 }
      );

      return {
        output: stdout || stderr,
        exitCode: 0,
      };
    } catch (error: any) {
      return {
        output: error.stderr || error.message,
        exitCode: error.code || 1,
      };
    }
  }

  /**
   * Stop the Docker Compose environment
   */
  static async stop(options = { removeVolumes: false, timeout: 10000 }): Promise<void> {
    if (!this.started) {
      return;
    }

    console.log('[TestCompose] Stopping Docker Compose...');

    try {
      const composeFiles = [
        '-f', 'docker-compose.infra.yml',
        '-f', 'docker-compose.db.yml',
        '-f', 'docker-compose.test.yml',
      ];

      const volumesFlag = options.removeVolumes ? '-v' : '';

      await execAsync(
        `docker compose ${composeFiles.join(' ')} down ${volumesFlag}`,
        { cwd: projectRoot }
      );

      console.log('[TestCompose] Stopped');
    } catch (error) {
      console.error('[TestCompose] Failed to stop:', error);
    } finally {
      this.started = false;
    }
  }

  /**
   * Get a container by service name (for compatibility)
   */
  static getContainer(serviceName: string) {
    if (!this.started) {
      throw new Error('Environment not started. Call start() first.');
    }
    return { serviceName: serviceName.endsWith('-1') ? serviceName : `${serviceName}-1` };
  }
}
