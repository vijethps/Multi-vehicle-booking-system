-- Migration 006: Payments and refunds

CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  amount              NUMERIC(10,2) NOT NULL,
  currency            VARCHAR(5) NOT NULL DEFAULT 'INR',

  payment_status      payment_status_enum NOT NULL DEFAULT 'pending',

  -- Gateway details
  gateway             VARCHAR(50) DEFAULT 'razorpay',   -- or 'simulation'
  gateway_order_id    VARCHAR(255),
  gateway_payment_id  VARCHAR(255),
  gateway_signature   VARCHAR(500),

  -- Idempotency
  idempotency_key     VARCHAR(255) UNIQUE,

  payment_method      VARCHAR(50),   -- card, upi, netbanking, etc.
  paid_at             TIMESTAMPTZ,
  failure_reason      TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking      ON payments(booking_id);
CREATE INDEX idx_payments_gateway_order ON payments(gateway_order_id);
CREATE INDEX idx_payments_status       ON payments(payment_status);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Refunds
CREATE TABLE refunds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  amount          NUMERIC(10,2) NOT NULL,
  reason          TEXT,
  status          VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processed, failed
  gateway_refund_id VARCHAR(255),
  processed_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refunds_payment  ON refunds(payment_id);
CREATE INDEX idx_refunds_booking  ON refunds(booking_id);

CREATE TRIGGER refunds_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
