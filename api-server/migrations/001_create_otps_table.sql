-- Migration: 001_create_otps_table
-- Creates a persistent OTP store in Supabase to survive server restarts.
-- Run this once against your Supabase project via the SQL editor or CLI.

CREATE TABLE IF NOT EXISTS otps (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT        NOT NULL,
  code       TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts   INTEGER     DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookup by email — also enforces one-OTP-per-email (upsert on conflict)
CREATE UNIQUE INDEX IF NOT EXISTS otps_email_idx ON otps(email);

-- auto-cleanup: a pg_cron job (or Supabase scheduled function) can run:
--   DELETE FROM otps WHERE expires_at < NOW() - INTERVAL '1 hour';
-- Alternatively, rely on the application-side cleanup on verify-otp success/failure.
