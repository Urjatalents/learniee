/**
 * DANGER: deletes ALL existing Cognito users and ALL database rows,
 * then creates a single admin account. Run once.
 *
 * Usage: npx tsx scripts/resetAndSetupAdmin.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";
import path from "path";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminDeleteUserCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const caCert = readFileSync(path.join(process.cwd(), "certs/rds-global-bundle.pem")).toString();
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { ca: caCert, rejectUnauthorized: true },
});
const prisma = new PrismaClient({ adapter });

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || "Admin";
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || "User";

async function deleteAllCognitoUsers() {
  let paginationToken: string | undefined;
  let total = 0;
  do {
    const res = await cognito.send(
      new ListUsersCommand({ UserPoolId: USER_POOL_ID, PaginationToken: paginationToken })
    );
    for (const user of res.Users ?? []) {
      if (!user.Username) continue;
      await cognito.send(
        new AdminDeleteUserCommand({ UserPoolId: USER_POOL_ID, Username: user.Username })
      );
      total++;
      console.log(`Deleted Cognito user: ${user.Username}`);
    }
    paginationToken = res.PaginationToken;
  } while (paginationToken);
  console.log(`Deleted ${total} Cognito users total.`);
}

async function wipeDatabase() {
  await prisma.student.deleteMany({});
  await prisma.parentProfile.deleteMany({});
  await prisma.teacherFile.deleteMany({});
  await prisma.teacherProfessional.deleteMany({});
  await prisma.teacher.deleteMany({});
  await prisma.admin.deleteMany({});
  console.log("Wiped ParentProfile, Student, Teacher, TeacherProfessional, TeacherFile, Admin.");
}

async function createSingleAdmin() {
  await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: ADMIN_EMAIL,
      UserAttributes: [
        { Name: "email", Value: ADMIN_EMAIL },
        { Name: "email_verified", Value: "true" },
        { Name: "custom:role", Value: "admin" },
      ],
      MessageAction: "SUPPRESS",
    })
  );

  await cognito.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: ADMIN_EMAIL,
      Password: ADMIN_PASSWORD,
      Permanent: true,
    })
  );

  const lookup = await cognito.send(
    new ListUsersCommand({ UserPoolId: USER_POOL_ID, Filter: `email = "${ADMIN_EMAIL}"` })
  );
  const sub = lookup.Users?.[0]?.Attributes?.find((a) => a.Name === "sub")?.Value;
  if (!sub) throw new Error("Could not find sub for newly created admin user");

  await prisma.admin.create({
    data: { cognitoId: sub, email: ADMIN_EMAIL, firstName: ADMIN_FIRST_NAME, lastName: ADMIN_LAST_NAME },
  });

  console.log(`Created single admin account: ${ADMIN_EMAIL}`);
}

async function main() {
  console.log("This will DELETE ALL existing Cognito users and ALL database rows.");
  console.log("Starting in 5 seconds — Ctrl+C now to cancel...");
  await new Promise((r) => setTimeout(r, 5000));

  await deleteAllCognitoUsers();
  await wipeDatabase();
  await createSingleAdmin();

  console.log("Done. Log in with the admin account now.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
