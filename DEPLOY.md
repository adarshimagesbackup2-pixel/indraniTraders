# Deploying Bardan ERP to Render

This app is set up to deploy as a **single Render Web Service** — the
Express server both serves the API (`/api/*`) and the built React app
(everything else), so there's no CORS setup and no second static site to
manage.

See the chat message this file came with for full step-by-step instructions,
environment variable values, and post-deploy checks.

Quick reference:

- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/health`
- **Required env vars:** `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV=production`
- **One-time after first deploy:** run `npm run prisma:seed --workspace=server` from a Render Shell to create the default admin login.
