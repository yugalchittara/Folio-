-- Folio PostgreSQL schema. Run only through the authenticated folio-data-api
-- Lambda, never from a browser or a client-side application.

CREATE TABLE IF NOT EXISTS payment_requests (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount TEXT NOT NULL,
  settlement_asset TEXT NOT NULL,
  settlement_chain TEXT NOT NULL,
  status TEXT NOT NULL,
  hosted_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  source_chain TEXT,
  source_tx TEXT,
  near_tx TEXT,
  destination_tx TEXT,
  channel TEXT DEFAULT 'pos',
  merchant_wallet_id TEXT
);

CREATE TABLE IF NOT EXISTS payment_events (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS business_wallets (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  network TEXT NOT NULL,
  role TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS business_contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  destination TEXT NOT NULL,
  network TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS business_bank_accounts (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_last_four TEXT NOT NULL,
  country TEXT NOT NULL,
  currency TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS business_integrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  webhook_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS business_operations (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  recipient TEXT NOT NULL,
  recipient_address TEXT,
  network TEXT,
  reference TEXT,
  source_wallet_id TEXT,
  bank_account_id TEXT,
  tx_hash TEXT,
  near_tx TEXT,
  destination_tx TEXT,
  deposit_address TEXT,
  route_status TEXT,
  provider_reference TEXT,
  amount TEXT NOT NULL,
  asset TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS operation_events (
  id BIGSERIAL PRIMARY KEY,
  operation_id TEXT NOT NULL REFERENCES business_operations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS payment_events_request_id_created_at_idx
  ON payment_events (request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS operation_events_operation_id_created_at_idx
  ON operation_events (operation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_requests_created_at_idx
  ON payment_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS business_operations_created_at_idx
  ON business_operations (created_at DESC);

INSERT INTO business_bank_accounts
  (id, nickname, bank_name, account_last_four, country, currency, created_at)
VALUES
  ('demo_cpn_usd', 'Operating account (demo)', 'Example Bank', '4826', 'US', 'USD', NOW())
ON CONFLICT (id) DO NOTHING;
