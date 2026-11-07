# AGENTS.md

## Layout
- Two independent npm packages, no workspace: `backend/` (Node ESM + Express + Socket.IO + MongoDB) and `frontend/` (React 19 + Vite 7 + Tailwind 4). Install and run them separately.
- Entrypoints: `backend/server.js`, `frontend/src/main.jsx`.
- Node 20 expected (frontend `.nvmrc`, backend `Dockerfile`); README says 18+.

## Running locally
- Backend: `cd backend && npm install && npm start` (nodemon, port 4000, auto-falls back to 4001). `npm run dev` = `node --watch`.
- Frontend: `cd frontend && npm install && npm run dev` (port 3001).
- Windows shortcut: `run.bat` (repo root) starts both servers and checks local MongoDB is listening on 27017 (skips the check if `MONGO_URI` is an Atlas URL).
- Backend exits immediately if `MONGO_URI` or `JWT_SECRET` is missing from `backend/.env`.

## Environment
- `.env` files are git-ignored; copy from the `.env.example` in each folder.
- Frontend needs only `VITE_BACKEND_URL` (default `http://localhost:4000`); `src/utils/api.js` and `src/utils/socket.js` both read it.
- Rate limiting is skipped entirely unless `NODE_ENV=production` — dev/test traffic never hits limits.
- The Stripe webhook route (`POST /api/payment/webhook`) is registered with `express.raw` **before** `express.json()` in `server.js`; that order is load-bearing.

## Backend commands
- `npm test` = `node --experimental-vm-modules node_modules/jest/bin/jest.js --detectOpenHandles --forceExit`. Run it via the npm script — plain `npx jest` fails on ESM imports.
- Seed scripts, run with `node <script>` from `backend/`: `seed-demo-seller.js`, `seed-real-products.js`, `seed-daraz-products.js` (demo data). `seed.js` creates the admin user + trending terms but requires `ADMIN_PASSWORD` in `.env`; it is git-ignored (local-only, not in the repo).

## Backend tests
- Jest tests spawn their own disposable mongod (`tests/helpers/setup.js`) on a random port with a temp dbpath — never the dev database.
- Requires a local mongod binary at `C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe`; override path with `TEST_MONGOD_EXE`.
- The helper auto-respawns wedged mongod instances and retries; timeout-style failures are retried automatically, so don't treat a "wedged mongod" log as an app bug.

## Frontend commands
- `npm test` = Vitest (jsdom). The only test file is `src/components/product/Card.test.jsx`.
- `npm run lint` = ESLint (flat config in `eslint.config.js`).
- Playwright is in devDependencies but there is no e2e suite or config — Vitest is the real test runner.
- Vite dev server proxies `/public/uploads` → backend (for legacy image URLs stored in MongoDB).

## Ops / deploy
- Frontend deploys to Vercel: `vercel.json` rewrites all routes to `index.html` (SPA) and runs `npm install --legacy-peer-deps --force`.
- Backend has a `Dockerfile` (node:20-alpine, port 4000).
- In-process crons start with the backend (wired in `server.js`): a tracking cron every 6h (`services/trackingService.js`) checks Domex tracking for "shipped" orders and marks them delivered only when the external status is "delivered" — it never auto-delivers by age; a payout cron every 30min (`services/payoutService.js`).
- `cron/delivery-cron.mjs` and `cron/keep-alive.mjs` are standalone scripts (run manually, e.g. `node cron/delivery-cron.mjs`), not started by the server. `cron/cron.json` is only a descriptive manifest and is **stale** (it describes age-based auto-delivery and a 12h keep-alive that the code does not implement).
- All uploads go to **Supabase Storage** — `uploadRouter.js` always calls `uploadToSupabase`; there is no local-disk branch. Requires `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` (the `STORAGE` env var in `.env.example`/README is not read by the upload code and is a no-op).
