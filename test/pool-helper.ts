import * as path from "path";
import {
  createPool,
  createSqlTag,
  ClientConfigurationInput,
  ValueExpression,
} from "slonik";
import { vi, afterAll, beforeEach } from "vitest";
import * as z from "zod";

/**
 * Gets a pool suitable for use in tests. Creates a schema based on the passed-in test file name,
 * which is wiped before every test. Adds an afterAll listener which makes sure jest exits cleanly.
 */
export async function getPoolHelper(params: {
  __filename: string;
  config?: ClientConfigurationInput;
}) {
  const sql = {
    ...createSqlTag(),
    unknown: function (
      parts: readonly string[],
      ...args: readonly ValueExpression[]
    ) {
      // it's not unsafe in the sense of sql-injection—this just means we're not validating the return type
      return { ...this.unsafe(parts, ...args), parser: z.unknown() };
    },
  };
  const schemaName = path.parse(params.__filename).name.replace(/\W/g, "_");
  const schemaIdentifier = sql.identifier([schemaName]);

  const pool = await createPool(process.env.TEST_DATABASE_URL!, {
    idleTimeout: 1,
    ...params?.config,
    interceptors: [
      {
        afterPoolConnection: async (context, connection) => {
          await connection.query(
            sql.unknown`set search_path to ${schemaIdentifier}`
          );
          return null;
        },
      },
      ...(params?.config?.interceptors ?? []),
    ],
  });

  // https://github.com/gajus/slonik/issues/63#issuecomment-500889445
  afterAll(() => new Promise((r) => setTimeout(r, 1)));

  beforeEach(async () => {
    await pool.query(
      sql.unknown`drop schema if exists ${schemaIdentifier} cascade`
    );
    await pool.query(sql.unknown`create schema ${schemaIdentifier}`);
  });

  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  /** Get the names from a list of migrations. Useful for light assertions */
  const names = (migrations: Array<{ name: string }>) =>
    migrations.map((m) => m.name);

  return { pool, schemaName, schemaIdentifier, mockLogger, names, sql };
}
