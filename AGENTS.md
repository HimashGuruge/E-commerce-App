# Repository Guidelines

## Project Overview
Full-stack real-time e-commerce site: an Express 4 + MongoDB REST API (`backend/`) and a React 19 + Vite SPA (`frontend/`) with cart/wishlist, admin & seller dashboards, Stripe payments, Google OAuth, live chat/notifications, and product tracking. Two independent apps in sibling folders — **no root package.json**, no workspaces; install/run in each folder separately.

## Architecture & Data Flow
- **Backend** (`backend/server.js`, port 4000): HTTP → `routes/<area>Router.js` (express.Router) → role middleware (`middleware/authMiddleware.js`) → `controller/<area>Controller.js` handlers (wrapped in `asyncHandler`) → Mongoose models (`models/*.js`) → MongoDB (`config/db.js`).
- **Frontend** (`frontend/src/main.jsx` → `App.jsx`): BrowserRouter → ErrorBoundary → AppLayout (Navbar/Routes/Footer) → pages in `components/pages/{shop,account,auth,admin,info}`. All HTTP goes through **one shared axios instance** (`src/utils/api.js`); client state lives in **localStorage + DOM CustomEvents**, not a global store.
- Real-time on the client is **setInterval polling** (chat 5s, notifications, order status) — WebSockets are server-side only (`ws` in server.js).

## Key Directories
| Path | Purpose |
|---|---|
| `backend/routes/` | One router file per area; mount in `server.js` under `/api/*` |
| `backend/controller/` | Request handlers (named exports, `asyncHandler`-wrapped) |
| `backend/models/` | 17 Mongoose models (User, Product, Variant, Order, Feedback, SiteConfig, …) |
| `backend/middleware/` | `authMiddleware.js` (JWT default export + `adminOnly`/`sellerOnly`/`sellerOrAdmin`), `uploadMiddleware.js` (multer) |
| `backend/services/` | `storageService.js` (local disk vs Supabase via `STORAGE` env), `trackingService.js` (cron scraping) |
| `backend/config/` | `env.js` (centralized dotenv config objects), `db.js` (Mongoose connect) |
| `backend/utils/` | `logger.js` (winston), `errorUtils.js` (`formatError`), `mailer.js` (nodemailer) |
| `backend/cron/` | Standalone node scripts (`delivery-cron.mjs`, `keep-alive.mjs`); schedules in `cron/cron.json` |
| `frontend/src/components/pages/` | Route pages: shop, account, auth, admin, info |
| `frontend/src/components/shared/` | AiChatBot, Feedback, Notification widgets, QuillEditor |
| `frontend/src/components/utils/` | Cart/Wishlist (localStorage + CustomEvent patterns) |
| `frontend/src/utils/` | `api.js` (axios), `supabaseClient.js` |

## Development Commands
All commands run **inside** their folder. Node **20** required; plain JavaScript (ESM), npm only.

```bash
# Backend (backend/)
npm install
npm start          # nodemon server.js
npm run dev        # node --watch server.js
node seed.js       # seed admin user (admin@example.com / Admin123!) + data
node add-products.js        # demo categories/products
node seed-daraz-products.js # bulk product import

# Frontend (frontend/)
npm install --legacy-peer-deps --force
npm run dev        # Vite dev server, port 3001
npm run build      # vite build
npm run lint       # eslint .
npm run test       # vitest run
```

Deployment: `backend/Dockerfile` (node:20-alpine, EXPOSE 4000); frontend deploys to Vercel via `vercel.json` (SPA rewrite).

**Env vars** (not committed): backend `.env`: `MONGO_URI`, `PORT` (4000), `JWT_SECRET`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID/SECRET`, `EMAIL_*`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STORAGE` (= `supabase` to switch uploads to cloud), `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `LOG_LEVEL`. Frontend `.env`: `VITE_BACKEND_URL` (default `http://localhost:4000`), `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`.

## Code Conventions & Common Patterns
- **Backend responses**: unified envelope `{ success: true, ...payload }` / `{ success: false, error }` produced by controllers and the final 4-arg error handler in `server.js`.
- **Error handling**: set status then `throw` so `asyncHandler` catches; translate Mongoose errors via `formatError` (`utils/errorUtils.js`); non-fatal side effects wrapped in try/catch with the winston `logger`.
- **Routing order**: specific paths before `:id` param routes (see `routes/productsRouter.js`).
- **Models**: schema with enums/`timestamps: true`, `pre('save')` bcrypt hook + `matchPassword()` instance method (see `models/User.js`).
- **Auth**: Bearer JWT from localStorage; frontend clears token/user and dispatches a window `'authChange'` event on 401 (in `utils/api.js`).
- **Frontend state pattern**: pure helper functions that persist a JSON blob to localStorage and dispatch a matching CustomEvent (`'cartUpdated'`, `'wishlistUpdated'`, `'settingsUpdated'`); consumers subscribe to the event.
- **Imports**: use path aliases `@/` (and `@components/*`, `@utils/*` per `frontend/jsconfig.json`); `@` → `src/` in Vite too.
- **Styling**: Tailwind CSS 4 with `brand-*` palette tokens (configured in `vite.config.js`), `class`-based dark mode.

## Important Files
- `backend/server.js` — app assembly: helmet/CORS/rate limits, Stripe raw-body webhook **before** `express.json()`, ~21 routers, static upload serving, WS, global error handler.
- `frontend/src/App.jsx` — root routes, theme polling of `/api/settings/public` every 60s, dashboard nav hiding.
- `frontend/vite.config.js` — port 3001, `/public/uploads` proxy → :4000, `@` alias, Tailwind plugin, Google-login COOP/COEP headers.
- `backend/cron/cron.json` — documented cron schedule (3AM delivery, 12h keep-alive).

## Runtime/Tooling Preferences
- **Node 20** (`frontend/.nvmrc`, `node:20-alpine` Dockerfile), **npm** (both have `package-lock.json`; no Bun/pnpm/yarn, no TS, no Prettier).
- No CI/CD, no Makefile/shell scripts, no root tooling.
- Frontend `npm install` needs `--legacy-peer-deps --force` (matches Vercel's `installCommand`).

## Testing & QA
- **Backend**: Jest is configured inline in `backend/package.json` (`npm test`) but **zero test files exist** — do not rely on it, and don't assume `npm test` passes.
- **Frontend**: Vitest is the runner (`npm run test` / `test:watch`); the only test is the placeholder `frontend/src/components/product/Card.test.jsx`. Playwright/@testing-library are installed but unused.
- Treat coverage as effectively nonexistent: verify changes manually (run both servers, exercise the changed route/component) rather than relying on suites.
