CREATE TABLE IF NOT EXISTS payment_events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_failures (
  id SERIAL PRIMARY KEY,
  razorpay_payment_id TEXT UNIQUE NOT NULL,
  subscription_id TEXT,
  customer_email TEXT,
  customer_contact TEXT,
  amount_paise INTEGER,
  currency TEXT DEFAULT 'INR',
  error_code TEXT,
  error_description TEXT,
  error_reason TEXT,
  status TEXT DEFAULT 'received',       
  classification TEXT,                   
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);