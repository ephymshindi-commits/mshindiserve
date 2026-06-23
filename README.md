# MshindiServe 🍖

**Production-grade restaurant & hotel management platform for Fine Breeze Bar & Grill, Nairobi.**

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | JWT (access + refresh rotation) + Argon2id |
| Payments | M-Pesa Daraja API (STK Push) |
| State | Zustand + React Query |
| Styling | Tailwind CSS |
| AI Concierge | Claude API (Haiku) |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (public)/         # Public pages: menu, rooms, events
│   ├── (auth)/           # Login, register pages
│   ├── (dashboard)/      # Customer: orders, bookings, tickets
│   ├── (admin)/admin/    # Admin panel (RBAC protected)
│   ├── (staff)/staff/    # Kitchen & reception panels
│   └── api/              # All API routes
├── components/
│   ├── public/           # Navbar, MenuCard, EventCard, RoomCard
│   ├── admin/            # AdminOrdersTable, RevenueChart
│   ├── staff/            # KitchenQueue
│   └── shared/           # AuthModal, CartDrawer, AIConcierge, CartFab
├── lib/
│   ├── prisma.ts         # Prisma client singleton
│   ├── jwt.ts            # JWT sign/verify helpers
│   ├── mpesa.ts          # M-Pesa Daraja integration
│   ├── middleware.ts      # withAuth, rateLimit, RBAC, logActivity
│   ├── api.ts            # Axios client + typed API helpers
│   └── utils.ts          # formatKES, cn, status colors, dates
├── store/
│   ├── authStore.ts      # Zustand auth state
│   └── cartStore.ts      # Zustand cart state
└── types/index.ts        # All TypeScript types
```

---

## 🚀 Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-org/mshindi-serve.git
cd mshindi-serve
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`. See `.env.example` for descriptions.

### 3. Set up the database (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. Copy the connection strings into `.env.local`
3. Run migrations:

```bash
npm run db:push        # Push schema to Supabase
npm run db:seed        # Seed sample data
npm run db:studio      # Browse data in Prisma Studio
```

### 4. Set up M-Pesa

1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create a Daraja app and get credentials
3. For local testing, use [ngrok](https://ngrok.com) to expose your callback URL:

```bash
ngrok http 3000
# Then set MPESA_CALLBACK_URL=https://xxxx.ngrok.io/api/payments/mpesa-callback
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 👥 Demo Credentials

After seeding (`npm run db:seed`):

| Role | Email | Password |
|---|---|---|
| Admin | admin@mshindiServe.ke | Admin@123! |
| Kitchen | kitchen@mshindiServe.ke | Staff@123! |
| Reception | reception@mshindiServe.ke | Staff@123! |
| Customer | grace@example.ke | User@123! |

---

## 🔐 Security Architecture

### Authentication
- **JWT access tokens** (15-minute lifetime, stored in memory/sessionStorage)
- **Refresh tokens** (7-day lifetime, HttpOnly cookie, rotated on every use)
- **Argon2id** password hashing (memory: 64MB, time: 3, parallelism: 4)
- Token reuse detection: if a refresh token is replayed, ALL tokens for that user are invalidated

### Authorization
Role-based access control on every API route:

| Route | Allowed Roles |
|---|---|
| `GET /api/menu` | Public |
| `POST /api/menu` | ADMIN |
| `GET /api/orders` | CUSTOMER (own), KITCHEN, ADMIN |
| `PATCH /api/orders/[id]` | KITCHEN, ADMIN |
| `GET /api/bookings` | CUSTOMER (own), RECEPTION, ADMIN |
| `GET /api/analytics` | ADMIN |
| `POST /api/tickets` | CUSTOMER, ADMIN |

### M-Pesa Payment Flow
```
Customer → STK Push request → Server creates pending Payment record
                                      ↓
                            Safaricom sends prompt to phone
                                      ↓
                        Customer confirms/cancels on phone
                                      ↓
                    Safaricom POSTs to /api/payments/mpesa-callback
                                      ↓
                    Server validates + updates Order/Booking/Ticket
```

**Critical:** Payment confirmation is ONLY processed server-side via the Safaricom callback. Frontend never sets paymentStatus directly.

### Other Security Measures
- Rate limiting on all sensitive endpoints
- Input validation with Zod on every API route
- Secure CORS policy
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Activity logging for all admin actions
- SQL injection prevention via Prisma's parameterized queries

---

## 📱 Pages & Routes

### Public (no auth required)
- `/` — Landing page with featured menu, events, testimonials
- `/menu` — Full menu with category filtering + add-to-cart
- `/rooms` — Room listings with availability
- `/events` — Upcoming events with ticket purchase

### Customer (auth required)
- `/orders` — Order history + live tracking
- `/bookings` — Room booking history
- `/tickets` — Event ticket history

### Admin (ADMIN role)
- `/admin/dashboard` — Revenue, orders, occupancy, popular items
- `/admin/orders` — All orders with status management
- `/admin/menu` — CRUD menu items
- `/admin/rooms` — CRUD rooms
- `/admin/events` — CRUD events
- `/admin/users` — User management
- `/admin/analytics` — Charts and analytics

### Staff
- `/staff/kitchen` — Live order queue (Kitchen role)
- `/staff/reception` — Booking management (Reception role)

---

## 📊 API Reference

### Auth
```
POST /api/auth/register    — Create account
POST /api/auth/login       — Sign in, get tokens
POST /api/auth/refresh     — Rotate tokens (uses cookie)
POST /api/auth/logout      — Invalidate refresh token
```

### Menu
```
GET  /api/menu             — List items (public, filterable by category/featured)
POST /api/menu             — Create item (ADMIN)
```

### Orders
```
GET  /api/orders           — List orders (own or all for staff)
POST /api/orders           — Place order
GET  /api/orders/:id       — Get order
PATCH /api/orders/:id      — Update status (KITCHEN/ADMIN)
```

### Bookings
```
GET  /api/bookings         — List bookings
POST /api/bookings         — Create booking (with conflict detection)
PATCH /api/bookings/:id    — Update status
```

### Tickets
```
GET  /api/tickets          — List tickets
POST /api/tickets          — Reserve ticket
```

### Payments
```
POST /api/payments/mpesa-stk       — Initiate STK Push
POST /api/payments/mpesa-callback  — Safaricom callback (no auth)
```

### Analytics
```
GET /api/analytics         — Dashboard stats (ADMIN)
```

### AI Concierge
```
POST /api/concierge        — Chat with Claude AI
```

---

## 🚢 Deployment

### Vercel (recommended)

```bash
npm install -g vercel
vercel --prod
```

Set environment variables in Vercel dashboard.

### Environment Checklist for Production

- [ ] `DATABASE_URL` and `DIRECT_URL` from Supabase
- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (min 64 chars, use `openssl rand -base64 64`)
- [ ] `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET` (production keys)
- [ ] `MPESA_ENV=PRODUCTION`
- [ ] `MPESA_CALLBACK_URL` pointing to your production domain
- [ ] `ANTHROPIC_API_KEY` for AI concierge
- [ ] `NODE_ENV=production`
- [ ] HTTPS enforced (handled by Vercel/hosting)

---

## 🌱 Extending MshindiServe

### Add SMS notifications (order confirmations)
Integrate Africa's Talking SMS API in `src/lib/sms.ts`, call after order/booking creation.

### Add real-time updates (Supabase Realtime)
Subscribe to `orders` table changes in the kitchen panel using `@supabase/supabase-js` realtime channels — eliminates polling.

### Add table reservation
Create a `Reservation` model in Prisma, add `/api/reservations` route, build a date/time picker UI.

### Add image uploads
UploadThing is already in `package.json`. Follow [uploadthing.com/docs](https://uploadthing.com) to wire up the image upload for menu items and rooms.

---

## 📞 Support

Platform built for **Fine Breeze Bar & Grill · Westlands, Nairobi**  
Contact: admin@mshindiServe.ke · +254 700 123 456
