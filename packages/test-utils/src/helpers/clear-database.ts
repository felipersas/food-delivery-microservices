import { PostgresTestContainer } from '../containers/postgres-container';

export interface ClearDatabaseOptions {
  skipTables?: string[];
  cascade?: boolean;
}

export async function clearDatabase(
  databaseName?: string,
  options: ClearDatabaseOptions = {}
): Promise<void> {
  const { skipTables = [], cascade = true } = options;

  const client = await PostgresTestContainer.getClient(databaseName);

  const result = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  const tables = result.rows
    .map((row) => row.tablename)
    .filter((table) => !skipTables.includes(table));

  await client.query('SET CONSTRAINTS ALL DEFERRED');

  const cascadeClause = cascade ? 'CASCADE' : '';
  for (const table of tables.reverse()) {
    await client.query(`TRUNCATE TABLE "${table}" ${cascadeClause}`);
  }

  await client.query('SET CONSTRAINTS ALL IMMEDIATE');
}

export async function clearTables(
  tables: string[],
  databaseName?: string,
  cascade = true
): Promise<void> {
  const client = await PostgresTestContainer.getClient(databaseName);

  const cascadeClause = cascade ? 'CASCADE' : '';
  for (const table of tables.reverse()) {
    await client.query(`TRUNCATE TABLE "${table}" ${cascadeClause}`);
  }
}

export async function resetSequences(databaseName?: string): Promise<void> {
  const client = await PostgresTestContainer.getClient(databaseName);

  const result = await client.query(`
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  `);

  for (const row of result.rows) {
    await client.query(`ALTER SEQUENCE "${row.sequence_name}" RESTART WITH 1`);
  }
}
