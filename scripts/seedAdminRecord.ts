/**
 * One-off: insert a single Admin row for a Cognito user that already exists
 * (login works) but has no matching row in the Admin table.
 *
 * Usage:
 *   set ADMIN_COGNITO_SUB, ADMIN_EMAIL, ADMIN_FIRST_NAME, ADMIN_LAST_NAME
 *   env vars, then: npx tsx scripts/seedAdminRecord.ts
 *
 * Does NOT touch Cognito or delete anything — only inserts into Postgres.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";
import path from "path";

const caCert = readFileSync(path.join(process.cwd(), "certs/rds-global-bundle.pem")).toString();
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { ca: caCert, rejectUnauthorized: true },
});
const prisma = new PrismaClient({ adapter });

const cognitoId = process.env.ADMIN_COGNITO_SUB!;
const email = process.env.ADMIN_EMAIL!;
const firstName = process.env.ADMIN_FIRST_NAME || "Admin";
const lastName = process.env.ADMIN_LAST_NAME || "User";

async function main() {
  if (!cognitoId || !email) {
    throw new Error("Set ADMIN_COGNITO_SUB and ADMIN_EMAIL env vars before running this.");
  }

  const existing = await prisma.admin.findUnique({ where: { cognitoId } });
  if (existing) {
    console.log("Admin row already exists for this cognitoId:", existing);
    return;
  }

  const admin = await prisma.admin.create({
    data: { cognitoId, email, firstName, lastName },
  });
  console.log("Created Admin row:", admin);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());