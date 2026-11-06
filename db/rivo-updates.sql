ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS whatsapp_updates_consent boolean NOT NULL DEFAULT false;
UPDATE orders SET payment_expires_at = created_at + interval '24 hours' WHERE payment_expires_at IS NULL AND status IN ('pending', 'payment_review');
CREATE INDEX IF NOT EXISTS orders_payment_expiry_idx ON orders (status, payment_expires_at);

CREATE TABLE IF NOT EXISTS telegram_managers (
  id serial PRIMARY KEY,
  telegram_id text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'Manager',
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS telegram_managers_active_idx ON telegram_managers (is_active);
ALTER TABLE telegram_managers ENABLE ROW LEVEL SECURITY;
