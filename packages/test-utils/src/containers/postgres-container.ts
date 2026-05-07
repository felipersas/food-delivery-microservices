import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Client } from 'pg';

let PgClient: typeof Client;

async function getClientClass(): Promise<typeof Client> {
  if (!PgClient) {
    const pg = await import('pg');
    PgClient = pg.Client;
  }
  return PgClient;
}

export class PostgresTestContainer {
  private static instance?: StartedPostgreSqlContainer;
  private static clients: Map<string, Client> = new Map();

  static async start(database = 'testdb'): Promise<string> {
    if (this.instance) {
      return this.instance.getConnectionUri();
    }

    this.instance = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase(database)
      .withUsername('postgres')
      .withPassword('postgres')
      .withReuse()
      .start();

    return this.instance.getConnectionUri();
  }

  static async createDatabase(databaseName: string): Promise<void> {
    if (!this.instance) {
      throw new Error('Container not started. Call start() first.');
    }

    const ClientClass = await getClientClass();
    const client = new ClientClass({
      connectionString: this.instance.getConnectionUri(),
    });
    await client.connect();

    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [databaseName]);

    await client.query(`DROP DATABASE IF EXISTS ${databaseName}`);
    await client.query(`CREATE DATABASE ${databaseName}`);
    await client.end();
  }

  static getConnectionUri(): string {
    if (!this.instance) {
      throw new Error('Container not started. Call start() first.');
    }
    return this.instance.getConnectionUri();
  }

  static async getClient(databaseName?: string): Promise<Client> {
    const baseUri = this.getConnectionUri();
    const uri = databaseName
      ? baseUri.replace(/\/[^/]*$/, `/${databaseName}`)
      : baseUri;

    if (!this.clients.has(uri)) {
      const ClientClass = await getClientClass();
      const client = new ClientClass({ connectionString: uri });
      await client.connect();
      this.clients.set(uri, client);
    }

    return this.clients.get(uri)!;
  }

  static async truncateDatabase(databaseName?: string): Promise<void> {
    const client = await this.getClient(databaseName);

    const result = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `);

    for (const row of result.rows) {
      await client.query(`TRUNCATE TABLE "${row.tablename}" CASCADE`);
    }
  }

  static async stop(): Promise<void> {
    for (const client of Array.from(this.clients.values())) {
      await client.end().catch(() => {
        // Ignore errors during cleanup
      });
    }
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
    return this.instance.getPort();
  }

  static getHost(): string {
    if (!this.instance) {
      throw new Error('Container not started. Call start() first.');
    }
    return this.instance.getHost();
  }
}
