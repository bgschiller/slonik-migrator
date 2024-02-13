import * as path from "path";
import { range } from "lodash";
import { SlonikMigrator } from "../src";
import { fsSyncer } from "fs-syncer";
import { getPoolHelper } from "./pool-helper";
import * as z from "zod";
import { describe, test, expect, vi, beforeEach } from "vitest";

const millisPerDay = 1000 * 60 * 60 * 24;
const fakeDates = range(0, 100).map((days) =>
  new Date(new Date("2000").getTime() + days * millisPerDay).toISOString()
);

const toISOSpy = vi.spyOn(Date.prototype, "toISOString");
toISOSpy.mockImplementation(() => fakeDates[toISOSpy.mock.calls.length - 1]);

describe("repair broken hashes", async () => {
  const { pool, sql, ...helper } = await getPoolHelper({ __filename });

  const migrationsPath = path.join(__dirname, `generated/${helper.schemaName}`);

  const syncer = fsSyncer(migrationsPath, {
    "01.one.sql": "create table migration_test_1(id int)",
    down: {
      "01.one.sql": "drop table migration_test_1",
    },
  });

  let migrator: SlonikMigrator;

  beforeEach(async () => {
    syncer.sync();
    migrator = new SlonikMigrator({
      slonik: pool,
      migrationsPath,
      migrationTableName: "migrations",
      logger: undefined,
    });

    await migrator.up();
  });
  [{ dryRun: true }, { dryRun: false }].forEach(({ dryRun }) => {
    test(`dryRun = ${dryRun}`, async () => {
      const getDbHash = () =>
        pool.oneFirst(sql.type(z.string())`
        select hash
        from migrations
      `);
      const setDbHash = (hash: string) =>
        pool.any(sql.unknown`
        update migrations
        set hash = ${hash}
      `);
      const dbHashCorrect = await getDbHash();
      await setDbHash("asd");
      await expect(getDbHash()).resolves.not.toEqual(dbHashCorrect);

      await migrator.repair({ dryRun });

      const dbHashAfterRepair = await getDbHash();

      if (dryRun) expect(dbHashAfterRepair).not.toEqual(dbHashCorrect);
      else expect(dbHashAfterRepair).toEqual(dbHashCorrect);
    });
  });
});
