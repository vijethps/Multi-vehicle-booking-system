-- Migration 003: Vehicles

CREATE TYPE fuel_type_enum AS ENUM ('petrol', 'diesel', 'electric', 'hybrid', 'cng', 'other');
CREATE TYPE transmission_enum AS ENUM ('manual', 'automatic', 'other');

CREATE TABLE vehicles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         INTEGER NOT NULL REFERENCES vehicle_categories(id) ON DELETE RESTRICT,
  vehicle_type_id     INTEGER REFERENCES vehicle_types(id) ON DELETE SET NULL,
  name                VARCHAR(200) NOT NULL,
  model               VARCHAR(100),
  make                VARCHAR(100),
  year                INTEGER,
  registration_number VARCHAR(50) UNIQUE,
  color               VARCHAR(50),

  -- Capacity
  passenger_capacity  INTEGER,
  cargo_capacity_kg   NUMERIC(10,2),   -- for trucks
  cargo_capacity_cbm  NUMERIC(10,2),   -- cubic meters

  -- Specs
  fuel_type           fuel_type_enum,
  transmission        transmission_enum,
  ac                  BOOLEAN DEFAULT FALSE,
  luggage_capacity    INTEGER,         -- bags/units

  -- Rental config
  supports_rental     BOOLEAN NOT NULL DEFAULT TRUE,
  supports_seat_booking BOOLEAN NOT NULL DEFAULT FALSE,
  supports_charter    BOOLEAN NOT NULL DEFAULT FALSE,
  supports_goods      BOOLEAN NOT NULL DEFAULT FALSE,

  -- Pricing
  pricing_method      pricing_method_enum NOT NULL DEFAULT 'daily',
  base_price          NUMERIC(10,2) NOT NULL DEFAULT 0,  -- per hour/day/km/trip
  min_rental_hours    INTEGER DEFAULT 1,
  security_deposit    NUMERIC(10,2) DEFAULT 0,
  driver_available    BOOLEAN DEFAULT FALSE,
  driver_charge       NUMERIC(10,2) DEFAULT 0,

  -- Meta
  description         TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  is_available        BOOLEAN NOT NULL DEFAULT TRUE,
  rating              NUMERIC(3,2) DEFAULT 0,
  total_reviews       INTEGER DEFAULT 0,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_category  ON vehicles(category_id);
CREATE INDEX idx_vehicles_type      ON vehicles(vehicle_type_id);
CREATE INDEX idx_vehicles_available ON vehicles(is_active, is_available);

CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Vehicle images
CREATE TABLE vehicle_images (
  id          SERIAL PRIMARY KEY,
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  url         VARCHAR(500) NOT NULL,
  alt_text    VARCHAR(200),
  is_primary  BOOLEAN DEFAULT FALSE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicle_images_vehicle ON vehicle_images(vehicle_id);

-- Vehicle amenities
CREATE TABLE vehicle_amenities (
  id          SERIAL PRIMARY KEY,
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  icon        VARCHAR(100),
  UNIQUE (vehicle_id, name)
);

-- Maintenance/blocked periods
CREATE TABLE vehicle_maintenance (
  id           SERIAL PRIMARY KEY,
  vehicle_id   UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  start_time   TIMESTAMPTZ NOT NULL,
  end_time     TIMESTAMPTZ NOT NULL,
  reason       VARCHAR(255),
  notes        TEXT,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT maintenance_dates_check CHECK (end_time > start_time)
);

CREATE INDEX idx_maintenance_vehicle ON vehicle_maintenance(vehicle_id, start_time, end_time);
