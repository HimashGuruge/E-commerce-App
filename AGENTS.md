# AGENTS.md

E-commerce app (Daraz-style). Two independent packages, no root package.json — always run npm commands inside `backend/` or `frontend/`.

## Stack
- **backend/** — Node 20+, Express 4, MongoDB (Mongoose 8), Socket.IO, Stripe, JWT, Multer, node-cron, Winston. ESM (`"type": "module"`). Entry: `server.js`.
- **frontend/** — React 19 + Vite 7 + Tailwind 4 + React Router 7 + Socket.IO client + Vitest. Deploy config: `vercel.json`.

## Running the app
- Prerequisite: **local MongoDB running on port 27017** (run.bat checks and aborts without it).
- Easiest: run `run.bat` from the repo root — it installs missing deps, copies `.env.example` → `.env` if absent, starts backend (4000) and frontend (3001), opens the browser.
- Manual:
  - `cd backend && npm run dev` (or `npm start` for nodemon)
  - `cd frontend && npm run dev`
- **Ports auto-fallback**: if 4000/3001 are taken, servers move to 4001/3002 — check the console/banner for the actual port before wiring anything.
- Backend **exits immediately** if `MONGO_URI` or `JWT_SECRET` is missing — copy `backend/.env.example` and set those before starting.
- Frontend expects only `VITE_BACKEND_URL` in `frontend/.env`.

## Env quirks (backend/.env)
- `STORAGE=` empty → uploads go to local `public/uploads/`; `STORAGE=supabase` → cloud storage via SUPABASE_URL/SUPABASE_SERVICE_KEY.
- `ADMIN_PASSWORD` empty → `node seed.js` skips creating the admin user.
- `MAX_UPLOAD_MB` (default 15) controls upload size.
- Google OAuth/SMTP/Stripe keys optional locally; server runs without them.

## Tests
- Backend (Jest, ESM): `npm test` from `backend/`. Single suite: `node --experimental-vm-modules node_modules/jest/bin/jest.js tests/<name>.test.js`.
- Frontend (Vitest): `npm test` from `frontend/` (`vitest run`); watch mode `npm run test:watch`.
- Frontend lints with `npm run lint` (ESLint 9 flat config); no typecheck (JS + jsconfig).
- Test harness (`backend/tests/helpers/setup.js`) spawns a disposable `mongod` per suite. On some Windows machines a spawned instance can **wedge** (process alive, accepts connections, never processes operations — driver ops hang forever). The helper detects it via a 12 s watchdog + 10 s driver op `timeoutMS` and respawns fresh instances (up to 3 per reset); suites that reset per test carry `jest.setTimeout(90_000)` to absorb the recovery. If a wedge strikes *inside* a test body, that single test can still fail (assertion on 500); rerunning the suite clears it.

## Maintenance scripts (backend/, manual only — not server code)

| File | Purpose |
|---|---|
| `seed.js` | Seeds the whole database (admin password comes from `ADMIN_PASSWORD` env) |
| `seed-daraz-products.js` | Seeds demo products |
| `seed-demo-seller.js` | Creates a demo seller |
| `restore-demo.cjs` | Restores demo data |
| `add-products.js` | CLI helper to add products |
| `set-admin-pw.mjs` | Sets an admin password |
| `check-admin.mjs` | Checks the admin user |
| `list-users.mjs` | Lists users |
| `migrate-message-recipient.js` | Migration script for the message recipient field |
| `test-login-direct.mjs` | Direct login endpoint test script |
| `test-token-direct.mjs` | Direct token validation test script |

## Gotchas
- `public/uploads/` and `logs/` are gitignored — never commit uploads or log files (this repo has history of mistakenly tracking them).
- Detailed backend structure (models/controllers/routes/services tables) lives in **`backend/agent.md`** — read it before touching backend code.
- Real-time flow: Socket.IO is wired in `server.js` + `services/socketService.js`; order status automation runs via `services/trackingService.js` cron (starts with the server).

## Git
- Active branch: `feat/seller-dashboard` (also `master`, `security`).
- Current tree has many uncommitted modifications in seller/messaging/notification areas — do not assume a clean baseline.

## Complete file listing

### Root
`AGENTS.md`, `run.bat`, `start-app.bat`

### backend/
`server.js`, `package.json`, `package-lock.json`, `nodemon.json`, `Dockerfile`, `.env`, `.env.example`, `.gitignore`, `agent.md`

**`config/`** — `db.js`, `env.js`

**`models/`** — `User.js`, `Seller.js`, `Product.js`, `Variant.js`, `Order.js`, `Address.js`, `Category.js`, `Ad.js`, `Announcement.js`, `Feature.js`, `Feedback.js`, `Message.js`, `Notification.js`, `Question.js`, `ReturnRequest.js`, `Service.js`, `SiteConfig.js`, `SliderItem.js`, `Trending.js`

**`controller/`** — `usersController.js`, `adminController.js`, `productsController.js`, `productVariantController.js`, `orderController.js`, `paymentController.js`, `addressController.js`, `sellerController.js`, `categoryController.js`, `adController.js`, `announcementController.js`, `featureController.js`, `feedbackController.js`, `messageController.js`, `notificationController.js`, `questionController.js`, `serviceController.js`, `settingsController.js`, `sliderController.js`, `trendingController.js`

**`routes/`** — `usersRouter.js`, `adminRouter.js`, `productsRouter.js`, `orderRouter.js`, `paymentRouter.js`, `addressRouter.js`, `sellersRouter.js`, `categoryRouter.js`, `adRouter.js`, `announcementRouter.js`, `featureRouter.js`, `feedbackRouter.js`, `messageRouter.js`, `notificationRouter.js`, `questionRouter.js`, `serviceRouter.js`, `settingsRouter.js`, `sliderRouter.js`, `trendingRouter.js`, `uploadRouter.js`

**`services/`** — `socketService.js`, `storageService.js`, `trackingService.js`, `reviewReminderService.js`, `sellerMessagingService.js`

**`middleware/`** — `authMiddleware.js`, `uploadMiddleware.js`

**`cron/`** — `delivery-cron.mjs`, `keep-alive.mjs`, `cron.json`

**`utils/`** — `logger.js`, `mailer.js`, `errorUtils.js`

**`tests/`** — `authMiddleware.test.js`, `formatError.test.js`, `reviewReminder.test.js`, `sellerAlerts.test.js`, `sellerRejection.test.js`, `socketService.test.js`, `verifiedPurchase.test.js`, plus `helpers/setup.js`

**Manual scripts** — `seed.js`, `seed-daraz-products.js`, `seed-demo-seller.js`, `restore-demo.cjs`, `add-products.js`, `set-admin-pw.mjs`, `check-admin.mjs`, `list-users.mjs`, `migrate-message-recipient.js`, `test-login-direct.mjs`, `test-token-direct.mjs`

**Ignored artifacts** — `logs/`, `public/uploads/`, `*.log` files (do not track)

### frontend/
`index.html`, `vite.config.js`, `vercel.json`, `eslint.config.js`, `jsconfig.json`, `.nvmrc`, `package.json`, `package-lock.json`, `.env`, `.env.example`, `.gitignore`, `README.md`

### frontend/src/ (114 files)
**Root** — `main.jsx`, `App.jsx`, `App.css`, `index.css`, `assets/react.svg`

**`hooks/`** — `usePublicSettings.jsx`

**`utils/`** — `api.js`, `color.js`, `siteSettings.js`, `socket.js`

**`components/layout/`** — `Navbar.jsx`, `Footer.jsx`, `DarkModeToggle.jsx`

**`components/home/`** — `Carousel3D.jsx`, `CountdownTimer.jsx`, `FlashSale.jsx`, `HomeBannerSlider.jsx`, `HomeInfomationsCard.jsx`, `ProductRecommendations.jsx`, `RightSideAds.jsx`

**`components/product/`** — `Card.jsx`, `Card.test.jsx`, `LeftSideFilter.jsx`

**`components/shared/`** — `AiChatBot.jsx`, `Feedback.jsx`, `InfiniteSlider.jsx`, `Newadds.jsx`, `QuillEditor.jsx`, `SkeletonLoader.jsx`

**`components/utils/`** — `Cart.jsx`, `Mediaupload.jsx`, `NotificationWidget.jsx`, `Wishlist.jsx`

**`components/pages/account/`** — `Orderpage.jsx`, `OrderDetailPage.jsx`, `OrderProgressTracker.jsx`, `OrderStatusBadge.jsx`, `ProfilePage.jsx`, `ReturnRequestPage.jsx`, `ViewCart.jsx`, `WishlistPage.jsx`

**`components/pages/admin/Dashboard/`** — `Dashboard.jsx`, `DashboardRoutes.jsx`, `AdminOrderedPage.jsx`, `DashboardTopbar.jsx`, `Sidebar.jsx`, `Footer.jsx`, `TopBar.jsx`, `StatCard.jsx`, `ManageServices.jsx`

**`components/pages/admin/marketing/`** — `AdminSellerManagement.jsx`, `AdminSellerDetail.jsx`, `AdsManagement.jsx`, `AnnouncementManagement.jsx`, `CategoryManagement.jsx`, `FeaturesManagement.jsx`, `FeedbackManagement.jsx`, `QuestionsManagement.jsx`, `SettingsManagement.jsx`, `SliderManagement.jsx`, `TrendingManagement.jsx`

**`components/pages/admin/orders/`** — `Payment.jsx`, `Notification.jsx`

**`components/pages/admin/products/`** — `AddProducts.jsx`, `EditProducts.jsx`, `AdminAllProductView.jsx`, `PendingProductApprovals.jsx`

**`components/pages/admin/returns/`** — `ReturnsManagement.jsx`

**`components/pages/admin/users/`** — `ControlUsersprivilege.jsx`

**`components/pages/auth/`** — `Login.jsx`, `SingUp.jsx`, `ForgotPasswordpage.jsx`, `ResetPasswordPage.jsx`

**`components/pages/email/`** — `EmailPage.jsx`, `EmailList.jsx`, `EmailSidebar.jsx`, `EmailReader.jsx`, `EmailRow.jsx`, `EmailTopBar.jsx`, `EmailAvatar.jsx`, `ComposeWindow.jsx`, `mockEmails.js`

**`components/pages/info/`** — `About.jsx`, `ContactPage.jsx`, `HelpPage.jsx`, `NotFound.jsx`, `PrivacyPolicy.jsx`, `ReturnsExchangesPages.jsx`, `Service.jsx`, `Shipping.jsx`, `ShippingInfoPage.jsx`, `TermsOfFService.jsx`, plus `Footer.jsx` (in `components/pages/`)

**`components/pages/shop/`** — `Homepage.jsx`, `HomeContainer.jsx`, `ShopPage.jsx`, `CategoryPage.jsx`, `StorePage.jsx`, `Productoverview.jsx`, and the seller area: `SellerDashboardHome.jsx`, `SellerDashboardLayout.jsx`, `SellerDashboardSidebar.jsx`, `SellerDashboardTopbar.jsx`, `SellerLanding.jsx`, `SellerRegister.jsx`, `SellerAddProduct.jsx`, `SellerProducts.jsx`, `SellerOrders.jsx`, `SellerOrdersFull.jsx`, `SellerEarnings.jsx`, `SellerMessages.jsx`, `SellerNotifications.jsx`, `SellerSettings.jsx`, `SellerChatPanel.jsx`
