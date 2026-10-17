# Real-Time E-Commerce Platform

A full-stack, working e-commerce website. Customers can browse products, add to cart, place orders and pay. Sellers can manage their own products and shops. An admin can manage users, categories, products, orders, banners, ads and site settings. Real-time features (chat, notifications, order status) are powered by Socket.IO.

## What the project does

- **Customer side**
  - Browse products by category, search, sorting and filters
  - View product details with variants (size/color) and images
  - Add to cart and checkout
  - Pay with **Stripe** (card payments with webhook confirmation)
  - Manage profile, addresses and order history
  - Live chat with seller/admin, notifications and FAQ
  - Google login support (OAuth)
- **Seller side**
  - Register/login as a seller
  - Add, edit and delete their own products
  - Manage their orders
- **Admin side**
  - Dashboard with sales/user/order charts
  - Manage users, sellers, categories, products, orders
  - Manage site: sliders/banners, ads, announcements, trending, services, feedback, questions
  - Chat with users, settings (site config)
- **Real-time**
  - Socket.IO events for chat, notifications and live order status updates
  - Automatic package tracking updates via a cron job (node-cron)

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
│   ├── cron/         # Delivery/keep-alive cron jobs
│   ├── utils/        # Logger, helpers
│   ├── seed.js       # Seeds database (admin + demo data)
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

Optional: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` for live payments, SMTP/Google keys, `ADMIN_EMAIL` + `ADMIN_PASSWORD` for seeding the admin.

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
npm run dev               # Start on http://localhost:5173 (Vite)
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
- `npm run test` — Vitest
- `npm run lint` — ESLint

## Notes

- The backend falls back to port `4001` if `4000` is already in use.
- Set `STORAGE=supabase` in `.env` with Supabase keys to use cloud storage; leave empty for local disk uploads.
- Rate limiting is relaxed/skipped outside production mode so local development is smooth.
