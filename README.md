# Bardan ERP — Onion Bag Manufacturing & Trading Management System

Full-stack ERP built to spec: React/Vite + Tailwind frontend, Express/TypeScript
backend, PostgreSQL via Prisma. Covers customer khata (ledger), order/challan
creation with GST, stock management, e-Way Bill JSON export, and WhatsApp
payment reminders.

## Prerequisites

- Node.js 20+
- Docker (for the bundled Postgres, or point `DATABASE_URL` at your own instance)

## First-time setup

```bash
# 1. Install all workspace dependencies
npm install

# 2. Start Postgres (or skip if you already have one running)
npm run docker:up

# 3. Configure environment
cp .env.example server/.env
cp .env.example client/.env   # only DATABASE_URL/PORT matter server-side; client just needs to exist if you add VITE_ vars later
# Edit server/.env: set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET to long random strings.

# 4. Generate Prisma client, run migrations, seed sample data
cd server
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
cd ..

# 5. Run both client and server in dev mode
npm run dev
```

The server runs on **http://localhost:4000**, the client on **http://localhost:5173**
(Vite proxies `/api` to the server automatically).

## Default login

After seeding:

- **Phone:** `9999999999`
- **Password:** `Admin@123`
- You'll be forced to change this password on first login.

## Project structure

```
shared/validation/   Zod schemas shared by client + server (single source of truth)
server/              Express API, Prisma schema, business logic services
client/              React/Vite frontend
```

## Notes on what's stubbed vs. fully implemented

- **WhatsApp reminders** use the free `wa.me` deep-link approach (opens WhatsApp
  Web/App with a pre-filled message) — this requires a staff member to tap
  "Send" per customer. The paid WhatsApp Business API automation described as
  a future Tier 2/3 option in the spec is not implemented (would require a
  paid Twilio/Meta account and credentials).
- **E-Way Bill generation** produces the NIC bulk-upload JSON file for
  download; actual submission to the government e-Way Bill portal must be
  done manually (there is no public free API for this).
- **PDF statement export** uses Puppeteer (headless Chromium) — the first
  run may take a few extra seconds while Chromium launches.

## Common commands

| Command | What it does |
|---|---|
| `npm run dev` | Runs client + server concurrently |
| `npm run build` | Builds both for production |
| `npm run db:migrate` | Runs Prisma migrations |
| `npm run db:seed` | Re-runs the seed script |
| `npm run docker:up` / `docker:down` | Start/stop the bundled Postgres+Adminer |

Adminer (DB browser) is available at **http://localhost:8080** when Docker is
running (server: `postgres`, user: `bardan`, password: `bardan_pass`, database:
`bardan_erp`).
