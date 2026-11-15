# SIGMA Construction Logbook

SIGMA is a machinery logbook, maintenance, cost-reporting, and project-administration application built with Next.js 16. The application is self-contained: Next.js provides the UI and backend, while an ordinary PostgreSQL database stores application data, authentication sessions, and uploaded files.

No hosted backend platform, Docker environment, Redis instance, separate authentication server, or external object-storage service is required.

The application backend uses:

- PostgreSQL through Drizzle ORM.
- Better Auth email/password authentication and database-backed sessions.
- Explicit server-side role and resource authorization.
- PostgreSQL `bytea` storage for avatars and maintenance attachments.
- Version-controlled Drizzle migrations and repeatable setup/seed scripts.

## Features

### Public machinery logging

- Select machinery and project data without an account.
- Record fuel usage and machine or truck shifts.
- Calculate effective hours from configured consumption rates.
- Resume or complete an open shift through an HttpOnly capability cookie.
- Update an existing log through its opaque public identifier.
- Prevent more than one active shift per machine.
- Close abandoned shifts after eight hours through application logic.

### Authenticated operations

- Dashboard and logbook reporting.
- Date, project, ownership, and machinery filters.
- PDF and Excel report generation.
- Administrative log correction.
- Project and machinery management.
- Machinery depreciation and operating-cost reporting.
- Maintenance requests, approval, attachments, costs, and spare parts.
- Account avatar and password management.

### Authentication and authorization

- Better Auth email/password login and logout.
- PostgreSQL-backed sessions and secure cookies.
- Password change and email-based password recovery.
- `admin` and `resident` application roles.
- Permission checks inside every privileged Server Action and Route Handler.
- Hashed, expiring, one-time maintenance approval tokens.

The public operator workflow does not represent an authenticated application role. It uses opaque capability tokens and exposes only the operations needed to create or finish machinery logs.

## Technology

- Next.js 16 App Router and Server Actions
- React 19
- TypeScript
- PostgreSQL 14+
- Drizzle ORM and Drizzle Kit
- Better Auth with its Drizzle adapter
- Tailwind CSS 4
- Zustand
- Resend and React Email
- ExcelJS, jsPDF, and Visx

## Project layout

```text
src/app/                 Pages, Server Actions, and Route Handlers
src/components/          Existing application UI
lib/db/                  PostgreSQL connection and Drizzle schemas
lib/auth.ts              Better Auth server configuration
lib/authorization.ts     Shared session and role checks
drizzle/                 Version-controlled PostgreSQL migrations
scripts/                 Setup, seed, provisioning, and user scripts
docs/                    Data-migration documentation
```

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL 14 or newer

The target database must already exist. Setup scripts never drop or recreate databases.

## Environment

Copy the example file and replace placeholder values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Next.js and Drizzle |
| `BETTER_AUTH_SECRET` | High-entropy secret used by Better Auth |
| `BETTER_AUTH_URL` | Canonical application origin, such as `http://localhost:3000` |

Optional variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Origin used in maintenance notification links |
| `RESEND_API_KEY` | Sends maintenance and password-reset emails |
| `MAINTENANCE_ORIGIN_EMAIL` | Verified sender address |
| `MAINTENANCE_ADMIN_EMAIL` | Recipient for maintenance approvals |
| `MAX_FILE_SIZE_BYTES` | File limit; defaults to `4000000` |
| `SEED_DEMO_DATA` | Seeds example machinery when set to `true` |
| `NEXT_PUBLIC_DEFAULT_DIESEL_PRICE` | Reporting fallback diesel price |

Never commit real credentials.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create an empty PostgreSQL database and configure `.env.local`.

3. Apply migrations and seed required catalog data:

   ```bash
   npm run db:setup
   ```

4. Create the first administrator:

   ```bash
   npm run auth:create-user -- admin@example.com 'replace-with-a-strong-password' admin 'Administrator'
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

Open `http://localhost:3000` for public machinery logging or `http://localhost:3000/login` for authenticated operations.

## Database workflows

| Command | Description |
| --- | --- |
| `npm run db:generate` | Generate SQL after changing a Drizzle schema |
| `npm run db:migrate` | Apply pending version-controlled migrations |
| `npm run db:seed` | Idempotently seed required catalogs and optional demo data |
| `npm run db:setup` | Run migrations followed by the seed process |
| `npm run db:check` | Check migration consistency |
| `npm run auth:create-user -- …` | Create an admin or resident through Better Auth |

`db:setup` is repeatable and non-destructive. Application tables live in `public`; Better Auth tables live in `auth`.

For production, use separate migration and runtime PostgreSQL roles where practical. The migration role needs schema and DDL privileges. The runtime role needs only schema usage, table DML, and sequence access. [scripts/db-provision.sql](scripts/db-provision.sql) is an optional provisioning template; set passwords outside source control.

## Authorization model

| Operation | Public operator | Resident | Admin |
| --- | ---: | ---: | ---: |
| Read machinery/projects for log entry | Yes | Yes | Yes |
| Create and finish capability-owned logs | Yes | Yes | Yes |
| View reports and log history | No | Yes | Yes |
| Correct completed logs | No | Yes | Yes |
| Create and edit maintenance requests | No | Yes | Yes |
| Approve maintenance from the application | No | No | Yes |
| Manage projects, machinery, and depreciation | No | No | Yes |
| Delete maintenance requests | No | No | Yes |

Maintenance approval emails contain a separate one-time token. Opening the email link displays a confirmation page; the status changes only after confirmation.

## PostgreSQL file storage

The `files` table keeps metadata separately from binary `bytea` content. Files are returned through `/api/files/[id]`, which validates the current session and ownership or role before reading the binary column.

- Avatar types: JPEG, PNG, GIF, and WebP.
- Maintenance attachment types: JPEG, PNG, and PDF.
- Default maximum size: 4,000,000 bytes.

The default remains below Vercel's 4.5 MB Function request/response limit. A standalone Node deployment can raise `MAX_FILE_SIZE_BYTES`; files larger than the Vercel limit require chunked transport, which this proof of concept does not implement.

PostgreSQL binary storage increases database size, backup duration, memory pressure, and restore time. It is appropriate for modest proof-of-concept files, not large media archives.

## Validation commands

```bash
npm test
npx tsc --noEmit --incremental false
npm run lint
npm run build
```

The repository had pre-existing full-project ESLint failures before this migration. Migration validation distinguishes those baseline issues from new errors and should still require TypeScript, focused tests, database setup, and the production build to pass.

## Deployment

### Standalone Node.js

1. Configure production environment variables and database connectivity.
2. Run `npm ci`.
3. Apply migrations from a trusted release job with `npm run db:migrate`.
4. Run `npm run build`.
5. Start with `npm start` behind a TLS-terminating reverse proxy with rate and request-size limits.
