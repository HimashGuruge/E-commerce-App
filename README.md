# Real-Time E-Commerce Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-A5D4FC?logo=vercel)](https://e-commerce-app-frontend-rouge.vercel.app/)

> **Live demo:** https://e-commerce-app-frontend-rouge.vercel.app/

A complete, working e-commerce platform. Customers browse, buy and pay. Sellers manage their own products and orders. Admins control the entire storefront — products, users, orders, marketing and live site settings. Real-time chat, notifications and order tracking run on Socket.IO.

## About the project

This is a full-stack, production-style e-commerce site built from the ground up. It is not a template demo — every role has a real, usable flow:

- **Customers** shop the catalog, add to cart, check out and pay with Stripe, track their orders, chat with sellers and use Google login.
- **Sellers** create a shop, list products with images and variants (size/color), and manage incoming orders.
- **Admins** run the backend office: a dashboard with charts, full CRUD over users/sellers/categories/products/orders, and a marketing console to control the homepage (banners, ads, announcements, trending, flash sale) and the look of the site in real time.

The standout parts:

- **Live admin controls with instant preview.** Settings such as the flash sale header (title, emoji, font, colors) and the shop filter "Sort By" box (colors, font size) are editable from the admin panel and reflect live via Socket.IO — no redeploy.
- **Real-time everywhere.** Chat, notifications, order status and settings changes push over Socket.IO.
- **Real payments.** Stripe card payments with webhook confirmation.
- **Automatic package tracking.** A cron job (node-cron) updates delivery status on its own.

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
- Live site settings: colors, fonts, navbar, footer, announcement bar, filter panel and more — applied instantly
- Chat with users and full site configuration

### Real-time
- Socket.IO events for chat, notifications, live order status and settings updates
- Automatic package-tracking cron (node-cron)

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

## Project structure

```
├── backend/          # Node.js + Express API
│   ├── config/       # DB connection, env helpers
│   ├── controller/   # Business logic per feature
│   ├── routes/       # API route files (users, products, orders, admin, ...)
│   ├── middleware/   # Auth & permission middleware
│   ├── models/       # Mongoose models
│   ├── services/     # Socket.io, tracking cron, tracking service
│   ├── cron/         # Delivery / keep-alive cron jobs
│   ├── utils/        # Logger, helpers
│   ├── seed.js       # Seeds the database (admin + demo data)
│   └── server.js     # App entry point
└── frontend/         # React + Vite app
    └── src/
        ├── components/
        │   ├── home/        # Homepage sections (banner, flash sale, featured)
        │   ├── layout/      # Navbar, footer, dark mode
        │   ├── pages/
        │   │   ├── account/ # Customer profile, orders, addresses
        │   │   ├── admin/   # Admin dashboard & management pages
        │   │   ├── auth/    # Login / register
        │   │   ├── info/    # About, terms, privacy, shipping, contact
        │   │   └── shop/    # Shop, product details, cart
        │   └── ...
        ├── App.jsx
        └── main.jsx
```

## Getting started

### Prerequisites
- Node.js (18+)
- MongoDB running locally (`mongodb://127.0.0.1:27017`)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

Edit `backend/.env` and set at least:

- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — a long random string

Optional: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` for live payments, SMTP/Google keys, and `ADMIN_EMAIL` + `ADMIN_PASSWORD` for seeding the admin.

```bash
node seed.js              # Seed the database (admin + demo products)
npm start                 # Start API on http://localhost:4000 (nodemon)
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

Set `VITE_BACKEND_URL` in `frontend/.env` (default `http://localhost:4000`).

```bash
npm run dev               # Start on http://localhost:3001 (Vite)
```

### Useful scripts

**Backend** (`backend/`):
- `npm start` — run with nodemon
- `npm run dev` — run with node --watch
- `npm test` — run Jest tests
- `node seed.js` — seed demo data

**Frontend** (`frontend/`):
- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm test` — Vitest
- `npm run lint` — ESLint

## Notes

- The backend falls back to port `4001` if `4000` is already in use.
- Set `STORAGE=supabase` in `.env` with Supabase keys to use cloud storage; leave empty for local disk uploads.
- Rate limiting is relaxed/skipped outside production mode so local development is smooth.
- Secret keys live only in your local `.env` files, which are git-ignored. The repo ships `.env.example` templates (placeholders only) — never real credentials.
