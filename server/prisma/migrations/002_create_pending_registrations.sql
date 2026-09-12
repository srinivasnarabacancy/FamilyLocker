-- Holds a registration between "Create Account" and successful OTP entry.
--
-- The user row is only INSERTed once the code is verified, so an abandoned or
-- mistyped sign-up leaves no account behind and does not consume the email
-- address.
--
-- This is a NEW table. It does not alter `users` or any existing table, so it
-- cannot affect current behaviour.
--
--   psql "$DIRECT_URL" -f prisma/migrations/002_create_pending_registrations.sql

BEGIN;

CREATE TABLE IF NOT EXISTS pending_registrations (
  id            BIGSERIAL PRIMARY KEY,

  -- Opaque handle returned to the browser. It identifies the pending sign-up
  -- without exposing the row id, and is the only thing the client holds.
  token         VARCHAR(64)  NOT NULL UNIQUE,

  name          VARCHAR(255) NOT NULL,
  family_name   VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,

  -- Already bcrypt-hashed by the API. A plaintext password is never stored,
  -- not even transiently.
  password      VARCHAR(255) NOT NULL,

  otp_code      VARCHAR(6)   NOT NULL,
  otp_expires_at TIMESTAMP(0) NOT NULL,

  -- Wrong guesses against the current code. Six digits is only ~20 bits, so
  -- expiry alone is not enough; the code is burned once this hits the limit.
  attempts      SMALLINT     NOT NULL DEFAULT 0,

  -- Throttles resends per pending registration.
  last_sent_at  TIMESTAMP(0),

  created_at    TIMESTAMP(0) NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP(0) NOT NULL DEFAULT NOW()
);

-- One live sign-up per address: a second attempt replaces the first rather
-- than leaving two codes valid at once.
CREATE UNIQUE INDEX IF NOT EXISTS pending_registrations_email_unique
  ON pending_registrations (email);

-- Supports the sweep of expired rows.
CREATE INDEX IF NOT EXISTS pending_registrations_expiry_idx
  ON pending_registrations (otp_expires_at);

COMMIT;
