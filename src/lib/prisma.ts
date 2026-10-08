import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// SSL is on by default (needed for RDS). Set DATABASE_SSL=false in .env
// when using a Postgres without SSL, such as the Docker one for the test run.
const useSsl = process.env.DATABASE_SSL !== "false";

const ssl = useSsl
  ? {
      ca: readFileSync(
        path.join(process.cwd(), "certs/rds-global-bundle.pem"),
      ).toString(),
      rejectUnauthorized: true,
    }
  : undefined;

// Pool size: on Vercel, every serverless invocation can spin up its own
// connection, so we keep this at 1 to avoid exhausting the DB connection
// cap. On a long-lived server (Docker/EC2, `next dev`) the app is one
// process and a page load fires many parallel API calls, so a pool of 1
// would make requests queue and time out. Override with DATABASE_POOL_MAX.
const isServerless = Boolean(process.env.VERCEL);
const defaultPoolMax = isServerless ? 1 : 5;
const poolMax = process.env.DATABASE_POOL_MAX
  ? Number(process.env.DATABASE_POOL_MAX)
  : defaultPoolMax;

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl,
  max: poolMax,
  idleTimeoutMillis: 10_000,
  // Extra headroom so a cold connection under a burst of parallel requests
  // doesn't time out before it can get a pool slot.
  connectionTimeoutMillis: 10_000,
});

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

globalForPrisma.prisma = prisma;