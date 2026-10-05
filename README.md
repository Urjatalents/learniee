# Learniee

Learniee is an EdTech tutoring platform connecting Parents, Teachers,
Admin, and Accounts. Built with Next.js and AWS.

**Full project documentation (architecture, data model, build plan,
open decisions, lessons learned) lives outside this repo, in the
project's knowledge base** - see that doc set for anything not
covered here. This README only covers what's needed to get the repo
running locally.

## Tech Stack

- **Frontend:** React + Next.js 16 (App Router, TypeScript, Server
  Components by default), Tailwind CSS + shadcn/ui (Base UI
  primitives, Nova preset)
- **State:** Zustand (client), React Query (server/async)
- **Auth:** AWS Cognito
- **Database:** AWS RDS PostgreSQL, via Prisma 7 (`@prisma/adapter-pg`)
- **File storage:** Amazon S3 (private bucket, presigned URLs -
  browser-to-S3 direct upload, files never pass through the server)
- **Hosting / CI-CD:** Vercel, auto-deploy on push to `master`
- **Payments:** Razorpay (decided, not yet integrated)
- **Video meetings:** Google Meet (Workspace organizer account via a
  service account with domain-wide delegation, auto-recorded; enabled
  with `GOOGLE_MEET_ENABLED`, see `src/lib/googleMeet.ts`)
- **SMS / OTP:** Fast2SMS (decided, not yet wired; Cognito's email
  OTP is what signup confirmation and password reset actually use
  today)

## Git remotes

This repo has two remotes in active use, and they are **not**
equivalent:

- `origin` → `Urjatalents/learniee` - the **main working repo**. All
  new development happens here. Push here first, always.
- `second-origin` → `apnanahihai-rgb/Learniee` - a **backup mirror
  only**. Kept identical to `origin` via an explicit
  `git push second-origin master --force`. Never push new work here
  first, and never `git pull`/`git fetch` from it expecting new
  work - it should only ever receive a force-sync copy of whatever
  `origin` already has.

```bash
# Normal day-to-day work
git add .
git commit -m "describe what you changed"
git push origin master

# Only when you specifically want the mirror to match main
git push second-origin master --force
```

If the two ever disagree, treat `origin` as the source of truth:
back up first (`git branch backup-before-reset`), then
`git fetch origin && git reset --hard origin/master`, then
force-sync the mirror as above.

## Setup

1. Clone the repository (from `origin`, the main repo):
   ```bash
   git clone https://github.com/Urjatalents/learniee.git
   cd learniee
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
   Always `npm`/`npx` - not `pnpm`, even if pnpm happens to be
   installed locally.
3. Copy `.env.example` to `.env.local` (read by the Next.js app) and
   to `.env` (read by the Prisma CLI - `migrate`/`studio`/`generate`
   don't read `.env.local`). Fill in real values for each service
   once it's set up.
   ```bash
   cp .env.example .env.local
   cp .env.example .env
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See `.env.example` for the full list with comments on where each
one is read and what it's for. Never commit `.env`/`.env.local`, and
never paste real credentials into a chat session, an issue, or a
commit message - if a secret is ever exposed that way, rotate it
immediately rather than just removing it from the code.

## Tests

```bash
npm test
```

A minimal Vitest setup — currently covers the pure helpers in
`src/lib/utils.ts` (e.g. `parseAge`). Not comprehensive; add
coverage as new business logic (Enrollment, Wallet, the Profits
calculation) gets built, since that's exactly the kind of money-
adjacent logic that's expensive to get wrong silently.

## Database (Prisma)

```bash
npx prisma migrate dev     # create/apply a migration locally
npx prisma generate        # regenerate the Prisma Client
```

`npx prisma studio` does not currently work against this project's
Prisma 7 + `@prisma/adapter-pg` setup - use a disposable Node script
instead if you need to inspect data directly (see
`src/lib/prisma.ts` for the client setup pattern to reuse in one).

**Before pushing any change that touches Prisma-writing code, run a
real production build, not just `npm run dev`:**

```bash
npm run build
```

`next build`'s type-check catches some real bugs that `next dev`
lets through silently (an unconverted `Decimal` field has bitten
this project before - always wrap numeric form values in
`Number(...)` before a Prisma `create`/`update`).

## S3 bucket setup (file uploads)

Teacher documents (step 3), Parent child photos (step 2), and Course
thumbnails/intro videos all go straight from the browser to S3 via
short-lived presigned URLs - see `src/lib/s3.ts` and
`/api/upload/presign`.

One-time bucket setup:

```bash
aws s3api create-bucket \
  --bucket <your-bucket-name> \
  --region <your-region> \
  --create-bucket-configuration LocationConstraint=<your-region>

# Keep the bucket fully private - access is always via a presigned
# URL, never a public bucket policy.
aws s3api put-public-access-block \
  --bucket <your-bucket-name> \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Allow the browser to PUT files directly from the app's origin(s)
aws s3api put-bucket-cors \
  --bucket <your-bucket-name> \
  --cors-configuration file://infra/s3-cors.json
```

The IAM user/role the app runs as needs at least `s3:PutObject` and
`s3:GetObject` on `arn:aws:s3:::<your-bucket-name>/*` - see
`infra/s3-iam-policy.json`.

## Project structure

`src/app` is routes-only; everything else (components, hooks, types,
server logic) lives under `src/features/<feature>/...`. Split any
file that grows past ~150-200 lines.

```
learniee/
├── certs/                 → real AWS RDS CA bundle (public cert, fine to commit)
├── infra/                 → S3 CORS config + minimum IAM policy
├── scripts/                → one-off provisioning scripts (e.g. Admin account)
├── prisma/                 → schema.prisma + migrations
├── src/
│   ├── app/                # ROUTES ONLY - pages + API route handlers
│   ├── features/           # ALL feature/business logic
│   │   └── <feature>/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── server/     # Prisma queries / business logic, kept out of route files
│   │       └── types/
│   ├── components/ui/      # shadcn/ui primitives ONLY
│   └── lib/                 # cross-cutting utilities (db client, auth helpers, S3, cn())
└── public/
```

Where a new file goes:

| Kind of file | Location |
|---|---|
| A page's route file | `src/app/<route>/page.tsx` - keep it thin |
| An API route handler | `src/app/api/<domain>/.../route.ts` - **must** be named exactly `route.ts`, or Next.js silently 404s it with no build warning |
| A component used by one feature | `src/features/<feature>/components/...` |
| A component used by 2+ features | `src/features/shared/components/...` |
| A hook/type used by one feature | `src/features/<feature>/hooks/...` or `.../types/...` |
| Cross-cutting utility | `src/lib/...` |

**API route convention:** auth check → parse input → call a service
function in `features/<feature>/server/<thing>.service.ts` → shape
the response. Keep Prisma queries and business logic in the service,
not the route handler, so two routes touching the same entity can't
drift apart. See `src/features/parent/server/student.service.ts` for
a worked example, and `src/features/parent/server/auth.ts` for how
repeated auth+lookup logic gets shared across routes.

## Contributing

```bash
git checkout master
git pull origin master   # always start from the latest main-repo state
# ...make changes...
npm run lint
npm run build             # catches errors npm run dev won't
git add .
git commit -m "describe what you changed"
git push origin master
```

## License

Private and unlicensed. All rights reserved.
