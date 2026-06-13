# AGENTS.md

## Cursor Cloud specific instructions

This is a Lovable-generated single-page app (Vite + React + TypeScript + shadcn-ui + Tailwind).
It is a frontend-only project that talks to a **hosted Supabase backend** (DB, auth, and edge
functions live in the cloud project referenced by `VITE_SUPABASE_URL` in `.env`). There is no
local backend/database to start — running the Vite dev server is enough to exercise the full app.

### Service: web app (Vite dev server)
- Run: `npm run dev` (Vite). The update script already runs `npm install`, so deps are present.
- This VM has no DNS for `localhost` exposure conventions; start it bound to all interfaces for
  browser testing: `npm run dev -- --host 0.0.0.0 --port 8080`.
- Lint: `npm run lint`. NOTE: lint currently reports pre-existing errors (mostly
  `@typescript-eslint/no-explicit-any` and one `no-require-imports` in `tailwind.config.ts`).
  These are pre-existing in the repo and are unrelated to environment setup — do not "fix" them
  unless that is the task.
- Build: `npm run build` (production) / `npm run build:dev` (development mode). Build succeeds.

### Backend / Supabase notes
- `.env` is committed and contains a real hosted Supabase URL + anon publishable key, so auth and
  data work out of the box against the cloud project — no local Supabase needed.
- Auth gotcha: the hosted Supabase project has **leaked-password protection enabled**. Weak
  passwords (e.g. `Test123456`) are rejected with "Password is known to be weak...". Use a strong,
  unique password when signing up test accounts.
- Sign-up auto-logs-in (email confirmation is effectively disabled on the project), then the app
  sets the new user's `profiles.role` to `parent` and redirects to `/parent`.

### Package manager
- Use **npm** (`package-lock.json` is present; README documents npm). `bun.lock`/`bun.lockb` also
  exist but npm is the supported path here and `bun` is not installed.
