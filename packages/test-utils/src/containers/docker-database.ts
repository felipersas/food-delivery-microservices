import { Client } from 'pg';

let PgClient: typeof Client;

async function getClientClass(): Promise<typeof Client> {
  if (!PgClient) {
    const pg = await import('pg');
    PgClient = pg.Client;
  }
  return PgClient;
}

/**
 * PostgreSQL connection helper for integration tests
 * Uses existing Docker infrastructure instead of Testcontainers
 *
 * @example
 * ```typescript
 * beforeAll(async () => {
 *   await DockerPostgres.connect();
 * });
 *
 * it('should query database', async () => {
 *   const result = await DockerPostgres.query('SELECT 1');
 * });
 * ```
 */
export class DockerPostgres {
  private static clients: Map<string, Client> = new Map();
  private static connected = false;

  /**
   * Connect to the PostgreSQL database for a specific service
   */
  static async connect(
    database = 'orders',
    port = 5432,
    host = 'localhost'
  ): Promise<void> {
    if (this.connected) return;

    const connectionString = `postgres://postgres:postgres@${host}:${port}/${database}`;
    const ClientClass = await getClientClass();
    const client = new ClientClass({ connectionString });

    await client.connect();
    this.clients.set(database, client);
    this.connected = true;
  }

  /**
   * Get a client for a specific database
   */
  static async getClient(
    database = 'orders',
    port = 5432,
    host = 'localhost'
  ): Promise<Client> {
    if (!this.clients.has(database)) {
      await this.connect(database, port, host);
    }
    return this.clients.get(database)!;
  }

  /**
   * Execute a query and return results
   */
  static async query(
    sql: string,
    params?: any[],
    database = 'orders',
    port = 5432,
    host = 'localhost'
  ): Promise<any> {
    const client = await this.getClient(database, port, host);
    return await client.query(sql, params);
  }

  /**
   * Truncate all tables in the database
   */
  static async truncateDatabase(
    database = 'orders',
    port = 5432,
    host = 'localhost'
  ): Promise<void> {
    const client = await this.getClient(database, port, host);

    const result = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);

    for (const row of result.rows) {
      await client.query(`TRUNCATE TABLE "${row.tablename}" CASCADE`);
    }
  }

  /**
   * Close all connections
   */
  static async closeAll(): Promise<void> {
    for (const client of Array.from(this.clients.values())) {
      await client.end().catch(() => {});
    }
    this.clients.clear();
    this.connected = false;
  }

  /**
   * Check if database is available
   */
  static async isAvailable(
    database = 'orders',
    port = 5432,
    host = 'localhost'
  ): Promise<boolean> {
    try {
      const client = await this.getClient(database, port, host);
      await client.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
