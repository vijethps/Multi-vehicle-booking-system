-- Migration 004: Routes, stops, trips, seat layouts

CREATE TYPE trip_status_enum AS ENUM (
  'scheduled', 'boarding', 'departed', 'completed', 'cancelled', 'delayed'
);

CREATE TYPE seat_type_enum AS ENUM (
  'seater', 'sleeper', 'semi_sleeper', 'upper_berth', 'lower_berth'
);

CREATE TYPE deck_enum AS ENUM ('lower', 'upper', 'single');

-- Routes
CREATE TABLE routes (
  id          SERIAL PRIMARY KEY,
  origin      VARCHAR(200) NOT NULL,
  destination VARCHAR(200) NOT NULL,
  distance_km NUMERIC(8,2),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (origin, destination)
);

CREATE TRIGGER routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Intermediate stops on a route
CREATE TABLE route_stops (
  id          SERIAL PRIMARY KEY,
  route_id    INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_name   VARCHAR(200) NOT NULL,
  stop_order  INTEGER NOT NULL,
  distance_from_origin_km NUMERIC(8,2),
  arrival_offset_minutes  INTEGER,   -- minutes from origin departure
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (route_id, stop_order)
);

-- Seat layouts (reusable templates for buses)
CREATE TABLE seat_layouts (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  description      TEXT,
  rows             INTEGER NOT NULL,
  cols_lower       INTEGER NOT NULL DEFAULT 4,  -- seats per row lower deck
  cols_upper       INTEGER,                     -- NULL if single deck
  has_upper_deck   BOOLEAN NOT NULL DEFAULT FALSE,
  layout_config    JSONB,   -- full layout matrix, admin-configurable
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER seat_layouts_updated_at
  BEFORE UPDATE ON seat_layouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Individual seat definitions for a layout
CREATE TABLE seats (
  id            SERIAL PRIMARY KEY,
  layout_id     INTEGER NOT NULL REFERENCES seat_layouts(id) ON DELETE CASCADE,
  seat_number   VARCHAR(10) NOT NULL,   -- e.g. "1A", "2B", "U1"
  row_number    INTEGER NOT NULL,
  position      VARCHAR(10) NOT NULL,  -- 'window', 'aisle', 'middle'
  deck          deck_enum NOT NULL DEFAULT 'single',
  seat_type     seat_type_enum NOT NULL DEFAULT 'seater',
  extra_charge  NUMERIC(8,2) NOT NULL DEFAULT 0,  -- premium seat surcharge
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (layout_id, seat_number)
);

CREATE INDEX idx_seats_layout ON seats(layout_id);

-- Scheduled trips
CREATE TABLE trips (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id         INTEGER NOT NULL REFERENCES routes(id) ON DELETE RESTRICT,
  vehicle_id       UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  layout_id        INTEGER NOT NULL REFERENCES seat_layouts(id) ON DELETE RESTRICT,
  departure_time   TIMESTAMPTZ NOT NULL,
  arrival_time     TIMESTAMPTZ NOT NULL,
  travel_date      DATE NOT NULL,
  base_fare        NUMERIC(10,2) NOT NULL,
  booking_cutoff   TIMESTAMPTZ,         -- no new bookings after this time
  status           trip_status_enum NOT NULL DEFAULT 'scheduled',
  notes            TEXT,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trip_times_check CHECK (arrival_time > departure_time)
);

CREATE INDEX idx_trips_route       ON trips(route_id);
CREATE INDEX idx_trips_vehicle     ON trips(vehicle_id);
CREATE INDEX idx_trips_travel_date ON trips(travel_date);
CREATE INDEX idx_trips_status      ON trips(status);

CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
