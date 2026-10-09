# Real-Time E-Commerce Platform

A full-stack e-commerce marketplace with **buyer**, **seller**, and **admin** roles. React SPA frontend, Express + MongoDB REST API, Stripe payments, Google OAuth login, live chat, notifications, and background order-tracking cron jobs.

Two independent apps in sibling folders — no workspaces. Install and run each separately.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, Axios, Chart.js |
| Backend | Node.js 20, Express 4, Mongoose (MongoDB) |
| Auth | JWT (Bearer), Google OAuth 2.0, bcrypt |
| Payments | Stripe Checkout + signed webhooks |
| Storage | Local disk by default; Supabase cloud when `STORAGE=supabase` |
| Realtime | Server-side WebSockets (`ws`); client polls at intervals |
| Cron | `node-cron` delivery-status scraping; standalone cron scripts |

## Features

- **Buyer**: product browsing/search, variants, cart, wishlist, checkout via Stripe, addresses, orders, feedback/reviews, live chat, notifications
- **Seller**: own-product CRUD, order management, delivery tracking
- **Admin**: users, orders, products, categories, site content (sliders, ads, announcements, services, features, trending terms), public settings/theme
- **Site engine**: announcement banners, slider, ads, FAQ questions, trending search terms, public settings polled every 60 s
- **Order tracking**: periodic scraping of shipping status via an external workflow API (`SIM_*` env vars)

## Project Structure

```
backend/            Express API (port 4000)
  server.js         app assembly, security middleware, routers, WS, error handler
  routes/           one router file per area (Router.js naming)
  controller/       asyncHandler-wrapped request handlers
  models/           Mongoose schemas (User, Product, Variant, Order, ...)
  middleware/       authMiddleware.js (JWT + role guards), uploadMiddleware.js
  services/         storageService.js, trackingService.js
  config/           db.js, env.js
  utils/            logger.js (winston), errorUtils.js, mailer.js
  cron/             standalone node-cron scripts + schedule
frontend/           React SPA (port 3001)
  src/App.jsx       root routes, theme polling, layout
  src/utils/api.js  single shared axios instance (token + 401 handling)
  src/components/pages/   shop, account, auth, admin, info pages
  src/components/shared/  AiChatBot, Feedback, Notifications, QuillEditor
  src/components/utils/   Cart/Wishlist (localStorage + CustomEvents)
```

## Getting Started

Requires **Node 20**.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env     # then fill in real values (see below)
npm start                # nodemon, port 4000

# optional
node seed.js             # seeds trending terms; creates admin only if
                         # ADMIN_EMAIL/ADMIN_PASSWORD are set in .env
node add-products.js     # demo categories/products
node seed-daraz-products.js
```

The server fails fast at startup if `MONGO_URI` or `JWT_SECRET` is missing.

### 2. Frontend

```bash
cd frontend
npm install --legacy-peer-deps --force
npm run dev              # Vite, port 3001
npm run build            # production build
npm run lint             # eslint
npm run test             # vitest
```

Then open `http://localhost:3001`.

## Environment Variables

### `backend/.env`

| Variable | Purpose |
|---|---|
| `PORT` | API port (default `4000`) |
| `MONGO_URI` | MongoDB connection string (**required**) |
| `JWT_SECRET` | JWT signing secret (**required**) |
| `FRONTEND_URL` / `BACKEND_URL` | CORS/redirect targets |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth login |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` | SMTP for email sending |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe payments |
| `STORAGE` | empty = local disk, `supabase` = cloud uploads |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Supabase storage |
| `SIM_API_KEY`, `SIM_WORKFLOW_URL` | package tracking workflow |
| `LOG_LEVEL` | winston level |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | used by `seed.js` to create the first admin |

### `frontend/.env`

| Variable | Purpose |
|---|---|
| `VITE_BACKEND_URL` | API base URL (default `http://localhost:4000`) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` | public Supabase access |

## API Areas

All routes are mounted under `/api/*` in `backend/server.js`: `users`, `products`, `categories`, `orders`, `payment`, `addresses`, `feedback`, `messages`, `notifications`, `ads`, `services`, `admin`, `trending`, `features`, `announcements`, `settings`, `sellers`, `questions`, `slider`, `upload`.

Responses use a unified envelope: `{ success: true, ...payload }` or `{ success: false, error }`.

## Deployment

- **Backend**: `backend/Dockerfile` (`node:20-alpine`, exposes 4000) — deploy to Render/Railway/Fly with `.env` set.
- **Frontend**: deploys to Vercel (`vercel.json` includes SPA rewrite); set `VITE_BACKEND_URL` to the deployed API URL.

## Conventions

- Controllers throw errors with a status set; `asyncHandler` + the final error handler in `server.js` convert them to the envelope.
- Specific paths are registered before `:id` param routes.
- User passwords hashed in a `pre('save')` hook; verified via `matchPassword()`.
- Frontend state lives in localStorage + DOM CustomEvents (`cartUpdated`, `wishlistUpdated`, `authChange`), not a global store.
- Path aliases `@/`, `@components/*`, `@utils/*` (see `frontend/jsconfig.json`).
