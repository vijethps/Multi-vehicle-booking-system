-- Migration 005: Bookings

CREATE TYPE booking_status_enum AS ENUM (
  'draft', 'pending_payment', 'pending_approval', 'confirmed',
  'active', 'completed', 'cancelled', 'expired', 'payment_failed', 'refund_pending'
);

CREATE TYPE booking_type_enum AS ENUM (
  'vehicle_rental', 'seat_booking', 'full_vehicle_charter', 'goods_transport'
);

CREATE TYPE payment_status_enum AS ENUM (
  'pending', 'success', 'failed', 'refunded', 'partially_refunded'
);

CREATE TABLE bookings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number        VARCHAR(20) UNIQUE NOT NULL,
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  vehicle_id            UUID REFERENCES vehicles(id) ON DELETE RESTRICT,
  trip_id               UUID REFERENCES trips(id) ON DELETE RESTRICT,

  booking_type          booking_type_enum NOT NULL,
  booking_status        booking_status_enum NOT NULL DEFAULT 'draft',
  payment_status        payment_status_enum NOT NULL DEFAULT 'pending',

  -- Rental dates
  pickup_datetime       TIMESTAMPTZ,
  return_datetime       TIMESTAMPTZ,

  -- Locations
  pickup_location       VARCHAR(300),
  dropoff_location      VARCHAR(300),

  -- For bus seat bookings: boarding/dropping stops
  boarding_stop_id      INTEGER REFERENCES route_stops(id),
  dropping_stop_id      INTEGER REFERENCES route_stops(id),

  -- Passengers
  passenger_count       INTEGER DEFAULT 1,

  -- Pricing snapshot (locked at booking time)
  subtotal              NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount            NUMERIC(10,2) NOT NULL DEFAULT 0,
  service_fee           NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  security_deposit      NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_refunded      BOOLEAN NOT NULL DEFAULT FALSE,

  -- Driver / extras
  driver_required       BOOLEAN DEFAULT FALSE,
  driver_charge         NUMERIC(10,2) DEFAULT 0,
  notes                 TEXT,

  -- Goods transport fields
  cargo_description     TEXT,
  cargo_weight_kg       NUMERIC(10,2),
  cargo_volume_cbm      NUMERIC(10,2),
  delivery_address      VARCHAR(300),
  special_handling      TEXT,

  -- Cancellation
  cancelled_at          TIMESTAMPTZ,
  cancellation_reason   TEXT,
  refund_amount         NUMERIC(10,2) DEFAULT 0,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT booking_rental_dates CHECK (
    booking_type != 'vehicle_rental' OR return_datetime > pickup_datetime
  )
);

CREATE INDEX idx_bookings_user    ON bookings(user_id);
CREATE INDEX idx_bookings_vehicle ON bookings(vehicle_id);
CREATE INDEX idx_bookings_trip    ON bookings(trip_id);
CREATE INDEX idx_bookings_status  ON bookings(booking_status);
CREATE INDEX idx_bookings_number  ON bookings(booking_number);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seat selections for seat-based bookings
CREATE TABLE booking_seats (
  id            SERIAL PRIMARY KEY,
  booking_id    UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  seat_id       INTEGER NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
  trip_id       UUID NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
  seat_price    NUMERIC(10,2) NOT NULL,   -- price locked at booking time
  passenger_name VARCHAR(100),
  passenger_age  INTEGER,
  passenger_gender VARCHAR(10),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (seat_id, trip_id)  -- prevents double-booking same seat on same trip
);

CREATE INDEX idx_booking_seats_booking ON booking_seats(booking_id);
CREATE INDEX idx_booking_seats_trip    ON booking_seats(trip_id);

-- Booking status history log
CREATE TABLE booking_status_history (
  id          SERIAL PRIMARY KEY,
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_status  booking_status_enum,
  new_status  booking_status_enum NOT NULL,
  changed_by  UUID REFERENCES users(id),
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_history_booking ON booking_status_history(booking_id);

-- Seat holds (temporary, during checkout)
CREATE TABLE seat_holds (
  id           SERIAL PRIMARY KEY,
  seat_id      INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id   UUID REFERENCES bookings(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (seat_id, trip_id)  -- only one active hold per seat per trip
);

CREATE INDEX idx_seat_holds_trip    ON seat_holds(trip_id);
CREATE INDEX idx_seat_holds_expires ON seat_holds(expires_at);

-- Booking sequence generator for human-readable booking numbers
CREATE SEQUENCE booking_number_seq START 100001;
