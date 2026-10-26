-- Migration 007: Reviews, pricing rules, notifications, audit logs

-- Pricing rules per vehicle (overrides vehicle base_price for specific scenarios)
CREATE TABLE pricing_rules (
  id              SERIAL PRIMARY KEY,
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  pricing_method  pricing_method_enum NOT NULL,
  base_rate       NUMERIC(10,2) NOT NULL,
  min_amount      NUMERIC(10,2),
  max_amount      NUMERIC(10,2),
  applies_from    TIMESTAMPTZ,   -- NULL = always applies
  applies_until   TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pricing_rules_vehicle ON pricing_rules(vehicle_id);

-- Reviews
CREATE TABLE reviews (
  id          SERIAL PRIMARY KEY,
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id  UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, user_id)
);

CREATE INDEX idx_reviews_vehicle ON reviews(vehicle_id);

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Notifications
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  type        VARCHAR(50) DEFAULT 'info',  -- info, success, warning, error
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  related_id  UUID,                        -- booking_id or trip_id
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user   ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Audit log for admin actions
CREATE TABLE audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  table_name  VARCHAR(100),
  record_id   VARCHAR(100),
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user    ON audit_logs(user_id);
CREATE INDEX idx_audit_action  ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
