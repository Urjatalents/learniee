// const { Client } = require("pg");
// const fs = require("fs");
// const path = require("path");

// // load DATABASE_URL from .env (no dotenv needed)
// const env = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
// const m = env.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
// if (!m) throw new Error("DATABASE_URL not found in .env");

// (async () => {
//   const c = new Client({
//     connectionString: m[1],
//     ssl: { ca: fs.readFileSync(path.join(__dirname, "certs/rds-global-bundle.pem")).toString() },
//   });
//   await c.connect();
//   const r = await c.query(
//     `SELECT id, "meetOrganizerEmail", "meetCohostEmail", "meetCohostError", "meetingUri"
// FROM "ClassSession" WHERE "meetingUri" IS NOT NULL
// ORDER BY "meetOrganizerAssignedAt" DESC NULLS LAST LIMIT 10`
//   );
//   console.table(r.rows);
//   await c.end();
// })().catch((e) => { console.error(e.message); process.exit(1); });

// Throwaway diagnostic. READ-ONLY. Delete after use.
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Session ids to inspect (newest rooms from check-meet.cjs).
const IDS = [
  "9c8ac93d-9060-4419-b871-d87753c625fd", // learnie@ room (no recording)
  "017f4e13-2a1b-428b-8948-3352a01cf8cf", // admin@ room
];

const env = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
function get(key) {
  const re = new RegExp("^" + key + "\\s*=\\s*(?:\"([\\s\\S]*?)\"|'([\\s\\S]*?)'|(.*))\\s*$", "m");
  const m = env.match(re);
  return m ? (m[1] ?? m[2] ?? m[3] ?? "").trim() : "";
}

const SA_EMAIL = get("GOOGLE_MEET_SA_CLIENT_EMAIL");
const SA_KEY = get("GOOGLE_MEET_SA_PRIVATE_KEY").replace(/\\n/g, "\n");
const b64 = (x) => Buffer.from(x).toString("base64url");

async function tokenFor(organizer) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    b64(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
    b64(JSON.stringify({
      iss: SA_EMAIL, sub: organizer,
      scope: "https://www.googleapis.com/auth/meetings.space.created",
      aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
    }));
  const sig = crypto.createSign("RSA-SHA256").update(unsigned).sign(SA_KEY).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: unsigned + "." + sig,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("token for " + organizer + ": " + JSON.stringify(data));
  return data.access_token;
}

async function api(token, url) {
  const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
  const text = await res.text();
  try { return { status: res.status, body: JSON.parse(text) }; } catch { return { status: res.status, body: text }; }
}

(async () => {
  const c = new Client({
    connectionString: get("DATABASE_URL"),
    ssl: { ca: fs.readFileSync(path.join(__dirname, "certs/rds-global-bundle.pem")).toString() },
  });
  await c.connect();
  const rows = (await c.query(
    `SELECT id, "meetSpaceName", "meetOrganizerEmail", "meetCohostEmail"
     FROM "ClassSession" WHERE id = ANY($1)`, [IDS])).rows;
  await c.end();

  for (const r of rows) {
    console.log("\n=== session", r.id, "| owner:", r.meetOrganizerEmail, "| teacher:", r.meetCohostEmail);
    const token = await tokenFor(r.meetOrganizerEmail);
    const space = await api(token, "https://meet.googleapis.com/v2/" + r.meetSpaceName);
    console.log("space status", space.status);
    console.log("config:", JSON.stringify(space.body.config ?? space.body));
    const mem = await api(token, "https://meet.googleapis.com/v2/" + r.meetSpaceName + "/members");
    console.log("members status", mem.status);
    console.log("members:", JSON.stringify(mem.body.members ?? mem.body, null, 1));
  }
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });