# Real-Time E-Commerce Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-A5D4FC?logo=vercel)](https://e-commerce-app-frontend-rouge.vercel.app/)
[![Frontend](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)
[![Node](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb)](https://www.mongodb.com)

> **Live demo:** https://e-commerce-app-frontend-rouge.vercel.app/

A complete, working e-commerce platform. Customers browse, buy and pay. Sellers manage their own products and orders. Admins control the entire storefront — products, users, orders, marketing and live site settings. Real-time chat, notifications and order tracking run on Socket.IO.

---

## About the project

This is a full-stack, production-style e-commerce site built from the ground up. It is not a template demo — every role has a real, usable flow:

- **Customers** shop the catalog, add to cart, check out and pay with Stripe, track their orders, chat with sellers and use Google login.
- **Sellers** create a shop, list products with images and variants (size/color), and manage incoming orders.
- **Admins** run the backend office: a dashboard with charts, full CRUD over users/sellers/categories/products/orders, and a marketing console to control the homepage (banners, ads, announcements, trending, flash sale) and the look of the site in real time.

### The standout parts

- **Live admin controls with instant preview.** Settings such as the flash sale header (title, emoji, font, colors) and the shop filter "Sort By" box (colors, font size) are editable from the admin panel and reflect live via Socket.IO — no redeploy.
- **Real-time everywhere.** Chat, notifications, order status and settings changes push over Socket.IO.
- **Real payments.** Stripe card payments with webhook confirmation.
- **Automatic package tracking.** A cron job (node-cron) updates delivery status on its own.

---

## What the project does

### Customer side
- Browse by category, search, sort and filter
- Product details with variants (size/color) and multiple images
- Cart, checkout and Stripe payment (card + webhook)
- Profile, saved addresses and order history
- Live chat with seller/admin, notifications and FAQ
- Google login (OAuth)

### Seller side
- Register and log in as a seller
- Add, edit and delete their own products
- Track and manage their orders

### Admin side
- Dashboard with sales / user / order charts
- Manage users, sellers, categories, products and orders
- Marketing console: banners/sliders, ads, announcements, trending, flash sale
- Flash sale management: pick exactly which products appear in the homepage marquee and set their order
- Announcement bar: editable text, colors, gradient, speed and per-item styling
- Live site settings: colors, fonts, navbar, footer, announcement bar, filter panel and more — applied instantly
- Chat with users and full site configuration

### Real-time
- Socket.IO events for chat, notifications, live order status and settings updates
- Automatic package-tracking cron (node-cron)

---

## Tech stack

| Part     | Tech |
|----------|------|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router 7, Axios, Socket.IO client, Chart.js, Framer Motion, Quill |
| Backend  | Node.js (ESM), Express 4, Socket.IO, MongoDB (Mongoose) |
| Payments | Stripe (secret key + webhook) |
| Storage  | Local disk or Supabase Storage (configurable) |
| Email    | SMTP via Nodemailer |
| Security | JWT auth, bcryptjs, Helmet, CORS, rate limiting |
| Testing  | Jest (backend), Vitest + Playwright (frontend) |

---

## Project structure

```
├── backend/            # Node.js + Express API
│   ├── config/         # DB connection, env helpers
│   ├── controller/     # Business logic per feature
│   ├── routes/         # API route files (users, products, orders, admin, ...)
│   ├── middleware/     # Auth & permission middleware
│   ├── models/         # Mongoose models
│   ├── services/       # Socket.io, tracking cron, tracking service
│   ├── cron/           # Delivery / keep-alive cron jobs
│   ├── public/         # Uploaded files (local storage fallback)
│   ├── tests/          # Jest tests
│   ├── utils/          # Logger, helpers
│   └── server.js       # App entry point
├── frontend/           # React + Vite app
│   └── src/
│       ├── components/
│       │   ├── home/        # Homepage sections (banner, flash sale, featured)
│       │   ├── layout/      # Navbar, footer, dark mode
│       │   ├── pages/
│       │   │   ├── account/ # Customer profile, orders, addresses
│       │   │   ├── admin/   # Admin dashboard & management pages
│       │   │   ├── auth/    # Login / register
│       │   │   ├── info/    # About, terms, privacy, shipping, contact
│       │   │   └── shop/    # Shop, product details, cart, homepage
│       │   └── ...
│       ├── App.jsx
│       └── main.jsx
├── run.bat             # Windows one-click: start both servers + open browser
├── start-app.bat       # Helper used by run.bat (runs `npm run dev` per app)
└── README.md
```

---

## Getting started

### Prerequisites

- **Node.js 18+** (with `npm`)
- **MongoDB** — either a local instance on `mongodb://127.0.0.1:27017` or a cloud Atlas URI

### Quick start (Windows, one command)

This repo ships a helper that checks MongoDB, installs dependencies, creates the `.env` files and starts both servers:

```bash
run.bat
```

It then opens the app at `http://localhost:3001`. The first run copies `backend/.env.example` → `backend/.env`, so **edit `backend/.env` and set `MONGO_URI` and `JWT_SECRET`** before relying on the defaults. To stop, close the two minimized windows named `ECOM-BACKEND` and `ECOM-FRONTEND`.

### Manual setup

<details>
<summary><b>1. Backend</b> (port 4000)</summary>

```bash
cd backend
npm install
copy .env.example .env        # Windows: use "copy"; on macOS/Linux: cp .env.example .env
```

Edit `backend/.env` and set at least:

- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — a long random string

```bash
npm start                     # Start API on http://localhost:4000 (nodemon)
```

</details>

<details>
<summary><b>2. Frontend</b> (port 3001)</summary>

```bash
cd frontend
npm install
copy .env.example .env        # Windows: use "copy"; on macOS/Linux: cp .env.example .env
```

Set `VITE_BACKEND_URL` in `frontend/.env` (default `http://localhost:4000`).

```bash
npm run dev                   # Start on http://localhost:3001 (Vite)
```

</details>

### Ports

| Service  | URL                       |
|----------|---------------------------|
| Frontend | http://localhost:3001     |
| Backend  | http://localhost:4000     |

If a port is already in use, the servers auto-pick the next one (4001 / 3002) — check the console for the actual port.

---

## Useful scripts

**Backend** (`backend/`):
- `npm start` — run with nodemon
- `npm run dev` — run with `node --watch`
- `npm test` — run Jest tests

**Frontend** (`frontend/`):
- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — ESLint
- `npm test` — Vitest
- `npm run test:watch` — Vitest in watch mode

---

## Environment variables

### `backend/.env`

| Variable | Required | Purpose |
|----------|:---:|---------|
| `MONGO_URI` | yes | MongoDB connection string (local or Atlas) |
| `JWT_SECRET` | yes | Secret for signing JWTs — use a long random string |
| `PORT` | no | API port, default `4000` (falls back to `4001`) |
| `FRONTEND_URL` | no | Used for CORS + cookie domain, default `http://localhost:3001` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Google OAuth login |
| `GOOGLE_EMAIL` / `GOOGLE_REFRESH_TOKEN` | optional | Service-style Google credentials (alt. to client ID/secret) |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_FROM_NAME` | optional | SMTP for transactional email (Nodemailer) |
| `STRIPE_SECRET_KEY` | for payments | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | for payments | Stripe webhook signing secret |
| `STORAGE` | no | Empty = local disk, `supabase` = cloud storage |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | optional | Supabase storage keys (when `STORAGE=supabase`) |
| `MAX_UPLOAD_MB` | no | Max upload size in MB, default `15` |
| `SIM_API_KEY` / `SIM_WORKFLOW_URL` | optional | External package-tracking workflow |
| `RATE_LIMIT_API_MAX` / `RATE_LIMIT_API_WINDOW_MIN` | no | API rate limit (relaxed for local dev) |
| `RATE_LIMIT_LOGIN_MAX` / `RATE_LIMIT_LOGIN_WINDOW_MIN` | no | Login rate limit |
| `LOG_LEVEL` | no | Log verbosity, default `info` |

### `frontend/.env`

| Variable | Required | Purpose |
|----------|:---:|---------|
| `VITE_BACKEND_URL` | yes | Base URL of the backend API, default `http://localhost:4000` |

---

## Notes

- The backend falls back to port `4001` if `4000` is already in use.
- Set `STORAGE=supabase` in `.env` with Supabase keys to use cloud storage; leave it empty for local disk uploads.
- Rate limiting is relaxed/skipped outside production mode so local development is smooth.
- Secret keys live only in your local `.env` files, which are git-ignored. The repo ships `.env.example` templates (placeholders only) — never real credentials.
