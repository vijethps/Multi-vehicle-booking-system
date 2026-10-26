# Multi-Transport Booking Platform

A full-stack multi-transport booking and rental management platform built with React, Node.js/Express, and PostgreSQL.

## Features
- Car, bike, bus, mini-bus, tempo, and truck bookings
- Individual seat selection for buses with real-time hold system
- Full vehicle charter / rental bookings
- Goods transport with cargo management
- JWT authentication with role-based access (customer, admin, fleet_manager)
- Payment integration (Razorpay + simulation mode for dev)
- Admin dashboard with fleet, booking, user, and revenue management
- Fully normalized PostgreSQL schema with transactions and double-booking prevention

## Tech Stack
- **Frontend:** React 18, Vite, Tailwind CSS, React Query, React Router
- **Backend:** Node.js, Express.js, JWT, bcryptjs
- **Database:** PostgreSQL

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Configure the database
Create a PostgreSQL database:
```sql
CREATE DATABASE multi_transport_db;
```

### 2. Backend setup
```bash
cd backend

# Edit .env with your DB credentials
copy .env.example .env

# Install dependencies (already done)
npm install

# Run migrations
npm run migrate

# Seed sample data
npm run seed

# Start dev server
npm run dev
```
Backend runs on http://localhost:5000

### 3. Frontend setup
```bash
cd frontend

npm install

npm run dev
```
Frontend runs on http://localhost:3000

---

## Test Credentials
| Role     | Email                       | Password     |
|----------|-----------------------------|--------------|
| Admin    | admin@transport.com         | Password123! |
| Customer | customer@example.com        | Password123! |
| Fleet    | fleet@transport.com         | Password123! |

---

## API Reference

### Auth
| Method | Endpoint             | Description        |
|--------|----------------------|--------------------|
| POST   | /api/auth/register   | Register user      |
| POST   | /api/auth/login      | Login              |
| GET    | /api/auth/me         | Get current user   |
| PUT    | /api/auth/profile    | Update profile     |

### Vehicles
| Method | Endpoint                        | Description           |
|--------|---------------------------------|-----------------------|
| GET    | /api/vehicles                   | List with filters     |
| GET    | /api/vehicles/:id               | Vehicle details       |
| GET    | /api/vehicles/:id/availability  | Check availability    |
| POST   | /api/vehicles                   | Create (admin)        |
| PUT    | /api/vehicles/:id               | Update (admin)        |

### Trips & Seats
| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| GET    | /api/trips                | Search trips             |
| GET    | /api/trips/:id/seats      | Get seat map for trip    |
| POST   | /api/seats/hold           | Hold seats (15 min)      |
| POST   | /api/seats/release        | Release holds            |

### Bookings
| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| POST   | /api/bookings             | Create booking           |
| GET    | /api/bookings/my          | Customer's bookings      |
| GET    | /api/bookings/:id         | Booking details          |
| POST   | /api/bookings/:id/cancel  | Cancel booking           |
| POST   | /api/bookings/pricing-quote | Get price estimate     |

### Payments
| Method | Endpoint                    | Description            |
|--------|-----------------------------|------------------------|
| POST   | /api/payments/create-order  | Create payment order   |
| POST   | /api/payments/verify        | Verify payment         |
| POST   | /api/payments/webhook       | Gateway webhook        |

### Admin
| Method | Endpoint                    | Description            |
|--------|-----------------------------|------------------------|
| GET    | /api/admin/dashboard        | Stats overview         |
| GET    | /api/admin/bookings         | All bookings           |
| GET    | /api/admin/reports/revenue  | Revenue report         |
| GET    | /api/admin/reports/fleet    | Fleet utilization      |
| GET    | /api/admin/users            | User management        |

---

## Booking Flow

```
Customer → Search vehicles/buses
       → Select vehicle or seats
       → POST /api/seats/hold (buses only, 15-min hold)
       → POST /api/bookings (creates booking in pending_payment)
       → POST /api/payments/create-order (get Razorpay/sim order)
       → Complete payment
       → POST /api/payments/verify (HMAC check + DB transaction)
       → Booking status → confirmed
       → Seats locked in booking_seats table
```

## Seat Double-Booking Prevention
- `UNIQUE(seat_id, trip_id)` on `booking_seats` at DB level
- `pg_advisory_xact_lock` per trip during hold creation
- Holds expire automatically via `expires_at` timestamp
- All seat confirmation happens inside a DB transaction
- Cancelled bookings release inventory automatically
