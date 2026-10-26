-- Migration 002: Vehicle categories and types

CREATE TYPE vehicle_category_enum AS ENUM (
  'car', 'bike', 'bus', 'mini_bus', 'tempo', 'truck', 'other'
);

CREATE TYPE pricing_method_enum AS ENUM (
  'hourly', 'daily', 'per_km', 'fixed', 'seat_based'
);

-- Top-level categories (car, bike, bus, etc.)
CREATE TABLE vehicle_categories (
  id                   SERIAL PRIMARY KEY,
  name                 VARCHAR(100) UNIQUE NOT NULL,
  slug                 VARCHAR(100) UNIQUE NOT NULL,
  category             vehicle_category_enum NOT NULL,
  description          TEXT,
  icon                 VARCHAR(100),
  -- Booking capabilities
  supports_rental      BOOLEAN NOT NULL DEFAULT TRUE,
  supports_seat_booking BOOLEAN NOT NULL DEFAULT FALSE,
  supports_charter     BOOLEAN NOT NULL DEFAULT FALSE,
  supports_goods       BOOLEAN NOT NULL DEFAULT FALSE,
  -- Display
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order           INTEGER DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER vehicle_categories_updated_at
  BEFORE UPDATE ON vehicle_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Sub-types within a category (e.g., Hatchback, Sedan, AC Sleeper Bus)
CREATE TABLE vehicle_types (
  id                  SERIAL PRIMARY KEY,
  category_id         INTEGER NOT NULL REFERENCES vehicle_categories(id) ON DELETE RESTRICT,
  name                VARCHAR(100) NOT NULL,
  slug                VARCHAR(100) NOT NULL,
  description         TEXT,
  default_capacity    INTEGER,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, slug)
);

CREATE TRIGGER vehicle_types_updated_at
  BEFORE UPDATE ON vehicle_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
