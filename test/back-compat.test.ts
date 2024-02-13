import * as path from "path";
import {
  setupSlonikMigrator,
  SlonikMigrator,
  SlonikMigratorOptions,
} from "../src";
import { fsSyncer } from "fs-syncer";
import { getPoolHelper } from "./pool-helper";
import { Umzug } from "umzug";
import { requireDotMain } from "./require.main";
import { vi, beforeEach, afterEach, describe, test, expect } from "vitest";

const runAsCLI = vi.spyOn(SlonikMigrator.prototype, "runAsCLI");
const warn = vi.spyOn(console, "warn");

beforeEach(() => {
  runAsCLI.mockImplementation(async () => true);
  warn.mockImplementation(() => {});
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("setupSlonikMigrator function still works", async () => {
  const { pool, ...helper } = await getPoolHelper({ __filename });

  const migrationsPath = path.join(__dirname, `generated/${helper.schemaName}`);

  const syncer = fsSyncer(migrationsPath, {
    "01.one.sql": "create table migration_test_1(id int)",
    "02.two.sql": "create table migration_test_2(id int)",
    down: {
      "01.one.sql": "drop table migration_test_1",
      "02.two.sql": "drop table migration_test_2",
    },
  });

  beforeEach(async () => {
    syncer.sync();
  });

  test("returns a SlonikMigrator instance", async () => {
    const migrator = setupSlonikMigrator({
      slonik: pool,
      migrationsPath,
      migrationTableName: "migrations",
      logger: undefined,
      reasonForUsingDeprecatedAPI: "Testing",
    });

    expect(migrator).toBeInstanceOf(SlonikMigrator);
    expect(migrator).toBeInstanceOf(Umzug);

    expect((await migrator.pending()).map((p) => p.name)).toEqual([
      "01.one.sql",
      "02.two.sql",
    ]);

    await migrator.up();

    await expect(migrator.pending()).resolves.toEqual([]);
    await expect(migrator.executed()).resolves.toHaveLength(2);

    expect(warn.mock.calls.map((c) => c[0])).toMatchInlineSnapshot(`
      [
        "@slonik/migrator: Use of setupSlonikMigrator is deprecated. Use \`new SlonikMigrator(...)\` which takes the same options instead",
        "Using \`mainModule\` is deprecated. Use \`migrator.runAsCLI()\` instead.",
      ]
    `);
  });

  test.skip("if mainModule set to require.main, runAsCLI is called", async () => {
    setupSlonikMigrator({
      slonik: pool,
      migrationsPath,
      migrationTableName: "migration_meta",
      logger: undefined,
      mainModule: undefined,
      reasonForUsingDeprecatedAPI: "Testing",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(runAsCLI).toHaveBeenCalledTimes(0);

    expect(warn.mock.calls.map((c) => c[0])).toMatchInlineSnapshot(`
      Array [
        "@slonik/migrator: Use of setupSlonikMigrator is deprecated. Use \`new SlonikMigrator(...)\` which takes the same options instead",
        "@slonik/migrator: Use of setupSlonikMigrator is deprecated. Use \`new SlonikMigrator(...)\` which takes the same options instead",
      ]
    `);

    warn.mockClear();

    setupSlonikMigrator({
      slonik: pool,
      migrationsPath,
      migrationTableName: "migration_meta",
      logger: undefined,
      mainModule: requireDotMain,
      reasonForUsingDeprecatedAPI: "Testing",
    });

    expect(runAsCLI).toHaveBeenCalledTimes(1);

    expect(warn.mock.calls.map((c) => c[0])).toMatchInlineSnapshot(`
      Array [
        "@slonik/migrator: Use of setupSlonikMigrator is deprecated. Use \`new SlonikMigrator(...)\` which takes the same options instead",
        "Using \`mainModule\` is deprecated. Use \`migrator.runAsCLI()\` instead.",
      ]
    `);

    expect(
      () =>
        new SlonikMigrator({
          slonik: pool,
          migrationsPath,
          migrationTableName: "migration_meta",
          logger: undefined,
          // @ts-expect-error
          mainModule: requireDotMain,
          reasonForUsingDeprecatedAPI: "Testing",
        })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Using \`mainModule\` is deprecated. Use \`migrator.runAsCLI()\` instead."`
    );
  });

  test(`reasonForUsingDeprecatedAPI isn't actually required at runtime`, async () => {
    const migrator = setupSlonikMigrator({
      slonik: pool,
      migrationsPath,
      migrationTableName: "migration_meta",
      logger: undefined,
      mainModule: undefined,
    } as any);

    expect(await migrator.pending()).toBeInstanceOf(Array);

    expect(warn.mock.calls.map((c) => c[0])).toMatchInlineSnapshot(`
      [
        "@slonik/migrator: Use of setupSlonikMigrator is deprecated. Use \`new SlonikMigrator(...)\` which takes the same options instead",
        "Using \`mainModule\` is deprecated. Use \`migrator.runAsCLI()\` instead.",
      ]
    `);
  });

  test("migrationTableName defaults to `migration`", async () => {
    const options: SlonikMigratorOptions = {
      slonik: pool,
      migrationsPath,
      migrationTableName: undefined as never,
      logger: undefined,
    };

    const migrator = setupSlonikMigrator({
      ...options,
      reasonForUsingDeprecatedAPI: "Testing",
    });

    expect((migrator as any).migrationTableNameIdentifier())
      .toMatchInlineSnapshot(`
        {
          "names": [
            "migration",
          ],
          "type": "SLONIK_TOKEN_IDENTIFIER",
        }
      `);

    expect(
      () => new SlonikMigrator(options)
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: @slonik/migrator: Relying on the default migration table name is deprecated. You should set this explicitly to 'migration' if you've used a prior version of this library.]`
    );
  });
});
