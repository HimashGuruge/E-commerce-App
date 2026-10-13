# Backend — Agent Guide

**Stack:** Node.js + Express 4, MongoDB via Mongoose 8, Socket.IO (real-time), Stripe (payments), JWT auth, Multer (uploads), node-cron, winston logging, Jest tests.

Entry point: `server.js`. Run with `npm start` (nodemon) or `npm run dev` (node --watch).

## Root files

| File | Purpose |
|---|---|
| `server.js` | Server entry: Express app setup, middleware, routes, Socket.IO, cron jobs, DB connect |
| `package.json` | Dependencies and npm scripts (`start`, `dev`, `test`) |
| `nodemon.json` | Nodemon restart config |
| `Dockerfile` | Docker build config |
| `.env` / `.env.example` | Env vars: DB URI, JWT secret, Stripe keys, SMTP |
| `.gitignore` | Git ignore rules |

### Seed / admin / maintenance scripts (run manually, not part of server)

| File | Purpose |
|---|---|
| `seed.js` | Seeds the whole database |
| `seed-daraz-products.js` | Seeds demo products |
| `seed-demo-seller.js` | Creates a demo seller |
| `add-products.js` | CLI helper to add products |
| `restore-demo.cjs` | Restores demo data |
| `set-admin-pw.mjs` | Sets an admin password |
| `check-admin.mjs` | Checks the admin user |
| `list-users.mjs` | Lists users |
| `migrate-message-recipient.js` | Migration script for message recipient field |
| `test-login-direct.mjs` | Direct login endpoint test script |
| `test-token-direct.mjs` | Direct token validation test script |

## Folders

### `config/`
| File | Purpose |
|---|---|
| `db.js` | Mongoose MongoDB connection |
| `env.js` | Loads/validates environment variables |

### `models/` (Mongoose models)
| File | Purpose |
|---|---|
| `User.js` | Customer account, roles, passwords (bcrypt) |
| `Seller.js` | Seller profile |
| `Product.js` | Product catalog |
| `Variant.js` | Product variants (size/color/price) |
| `Order.js` | Orders + order items, status tracking |
| `Address.js` | Customer addresses |
| `Category.js` | Product categories |
| `Ad.js` | Site ad placements |
| `Announcement.js` | Site-wide announcements |
| `Feature.js` | Homepage feature blocks |
| `Feedback.js` | Customer feedback |
| `Message.js` | User↔seller chat messages |
| `Notification.js` | User notifications |
| `Question.js` | Help/Q&A questions |
| `ReturnRequest.js` | Return/refund requests |
| `Service.js` | Services listings |
| `SiteConfig.js` | Global site settings |
| `SliderItem.js` | Homepage slider items |
| `Trending.js` | Trending products config |

### `controller/` (route handlers)
| File | Purpose |
|---|---|
| `usersController.js` | Auth (register/login) + user profile |
| `adminController.js` | Admin dashboard actions |
| `productsController.js` | Product CRUD + listing |
| `productVariantController.js` | Variant CRUD |
| `orderController.js` | Orders, status updates, returns |
| `paymentController.js` | Stripe payment + webhook handling |
| `addressController.js` | Address CRUD |
| `sellerController.js` | Seller registration/profile/orders |
| `categoryController.js` | Category management |
| `adController.js` | Ad management |
| `announcementController.js` | Announcement management |
| `featureController.js` | Feature block management |
| `feedbackController.js` | Feedback handling |
| `messageController.js` | Chat messages (with Socket.IO) |
| `notificationController.js` | Notification handling |
| `questionController.js` | Q&A handling |
| `serviceController.js` | Services management |
| `settingsController.js` | Site settings read/update |
| `sliderController.js` | Slider management |
| `trendingController.js` | Trending management |

### `routes/` (Express routers)
Each `*Router.js` maps HTTP endpoints to its matching controller: `usersRouter`, `adminRouter`, `productsRouter`, `orderRouter`, `paymentRouter`, `addressRouter`, `sellersRouter`, `categoryRouter`, `adRouter`, `announcementRouter`, `featureRouter`, `feedbackRouter`, `messageRouter`, `notificationRouter`, `questionRouter`, `serviceRouter`, `settingsRouter`, `sliderRouter`, `trendingRouter`, `uploadRouter`.

### `services/`
| File | Purpose |
|---|---|
| `socketService.js` | Socket.IO real-time events (chat, notifications, orders) |
| `storageService.js` | Multer file upload handling |
| `trackingService.js` | Order tracking/status flow |
| `reviewReminderService.js` | Post-delivery review reminders |
| `sellerMessagingService.js` | Seller chat + alert logic |

### `middleware/`
| File | Purpose |
|---|---|
| `authMiddleware.js` | JWT verification, role checks |
| `uploadMiddleware.js` | Multer upload configuration |

### `cron/`
| File | Purpose |
|---|---|
| `delivery-cron.mjs` | Auto order status updates (node-cron) |
| `keep-alive.mjs` | Keep-alive/health job |
| `cron.json` | Cron schedule config |

### `utils/`
| File | Purpose |
|---|---|
| `logger.js` | Winston logging |
| `mailer.js` | Nodemailer email sending |
| `errorUtils.js` | `formatError` — standard error response shape |

### `tests/` (Jest)
| File | Purpose |
|---|---|
| `authMiddleware.test.js` | Auth middleware tests |
| `formatError.test.js` | Error util tests |
| `reviewReminder.test.js` | Review reminder tests |
| `sellerAlerts.test.js` | Seller alert tests |
| `socketService.test.js` | Socket service tests |
| `verifiedPurchase.test.js` | Verified-purchase logic tests |
| `helpers/setup.js` | Test setup/teardown helper |

### `public/uploads/`
Uploaded product/media files (served statically by Express).

### `logs/`
Winston log output.
