/**
 * One-off: fixes a migration-ordering bug.
 *
 * `20260907111609_add_reschedule_request_relations` (adds
 * RescheduleRequest's FKs) was timestamped *before*
 * `20260907170000_add_reschedule_request` (creates the
 * RescheduleRequest table it depends on). It was already applied to
 * the real database years — sorry, minutes — before the ordering
 * bug was noticed, so production itself is fine (already-applied
 * migrations are never replayed). But `prisma migrate dev` replays
 * every migration from scratch against a disposable shadow database
 * in folder-name order, so it hits the FK migration before the
 * table exists and fails with P3018 / "relation RescheduleRequest
 * does not exist".
 *
 * The fix is the folder rename shipped alongside this script
 * (`20260907111609_..._relations` -> `20260907170001_..._relations`,
 * one second after the table-creation migration). That alone isn't
 * enough on its own, though: the real database's `_prisma_migrations`
 * table still has a row recorded under the OLD name. Without this
 * script, `prisma migrate deploy`/`migrate dev` would see the new
 * folder name as a migration it's never applied and try to run it
 * again — which would then fail for the opposite reason (the FK
 * constraints already exist).
 *
 * This script renames that one row in place. It does NOT touch the
 * shadow database (which `migrate dev` creates and drops itself) —
 * only the real one at `DATABASE_URL`. Idempotent: safe to re-run,
 * it only updates a row if the old name is still present.
 *
 * Usage: npx tsx scripts/fixRescheduleMigrationOrder.ts
 *
 * Run this once against the real database BEFORE the next
 * `prisma migrate dev`/`migrate deploy`. If you have more than one
 * real Postgres instance (e.g. a separate staging DB), run it
 * against each one — this only touches whatever `DATABASE_URL`
 * currently points at.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";
import path from "path";

const OLD_NAME = "20260907111609_add_reschedule_request_relations";
const NEW_NAME = "20260907170001_add_reschedule_request_relations";

const caCert = readFileSync(path.join(process.cwd(), "certs/rds-global-bundle.pem")).toString();
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { ca: caCert, rejectUnauthorized: true },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`,
    OLD_NAME,
  );

  if (existing.length === 0) {
    console.log(`No row found for "${OLD_NAME}" — already fixed, or migrate deploy hasn't run it yet. Nothing to do.`);
    return;
  }

  const alreadyRenamed = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`,
    NEW_NAME,
  );
  if (alreadyRenamed.length > 0) {
    throw new Error(`A row named "${NEW_NAME}" already exists — investigate before running this again.`);
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "_prisma_migrations" SET migration_name = $1 WHERE migration_name = $2`,
    NEW_NAME,
    OLD_NAME,
  );

  console.log(`Renamed "${OLD_NAME}" -> "${NEW_NAME}" in _prisma_migrations. Safe to run migrate dev/deploy now.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
