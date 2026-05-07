import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';

export class RedisTestContainer {
  private static instance?: StartedRedisContainer;
  private static clients: Map<string, Redis> = new Map();

  static async start(): Promise<string> {
    if (this.instance) {
      return this.getConnectionUrl();
    }

    this.instance = await new RedisContainer('redis:7-alpine')
      .withReuse()
      .start();

    return this.getConnectionUrl();
  }

  static getConnectionUrl(): string {
    if (!this.instance) {
      throw new Error('Container not started. Call start() first.');
    }
    return this.instance.getConnectionUrl();
  }

  static async getClient(db = 0): Promise<Redis> {
    const baseUrl = this.getConnectionUrl();
    const url = `${baseUrl}/${db}`;

    if (!this.clients.has(url)) {
      const client = new Redis(url);
      this.clients.set(url, client);
    }

    return this.clients.get(url)!;
  }

  static async flushDb(db = 0): Promise<void> {
    const client = await this.getClient(db);
    await client.flushdb();
  }

  static async flushAll(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const client of this.clients.values()) {
      promises.push(client.flushdb());
    }

    await Promise.all(promises);
  }

  static async stop(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    for (const client of this.clients.values()) {
      closePromises.push(
        client.quit().catch(() => {
          // Ignore errors during cleanup
        })
      );
    }

    await Promise.all(closePromises);
    this.clients.clear();

    if (this.instance) {
      await this.instance.stop();
      this.instance = undefined;
    }
  }

  static isRunning(): boolean {
    return this.instance !== undefined;
  }

  static getPort(): number {
    if (!this.instance) {
      throw new Error('Container not started. Call start() first.');
    }
    const url = this.getConnectionUrl();
    const match = url.match(/:(\d+)(?:\/\d+)?$/);
    return match ? parseInt(match[1], 10) : 6379;
  }

  static getHost(): string {
    if (!this.instance) {
      throw new Error('Container not started. Call start() first.');
    }
    const url = this.getConnectionUrl();
    const match = url.match(/redis:\/\/([^:]+):\d+/);
    return match ? match[1] : 'localhost';
  }
}
