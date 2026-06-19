-- Migration: 002_user_push_tokens_pk.sql
-- Adds a proper UUID primary key to user_push_tokens, relaxes email
-- from PK to an indexed column, and adds a unique constraint on
-- (email, token) to prevent duplicate registrations per device.
--
-- Safe to run on an existing table: the operations are done inside a
-- transaction so the table is either fully migrated or left untouched.

BEGIN;

-- 1. Add the new UUID primary key column (defaults to gen_random_uuid()).
ALTER TABLE user_push_tokens
  ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT gen_random_uuid();

-- 2. Drop the old email-based primary key constraint.
--    Replace 'user_push_tokens_pkey' with the actual constraint name if it
--    differs in your Supabase project (check via \d user_push_tokens).
ALTER TABLE user_push_tokens
  DROP CONSTRAINT IF EXISTS user_push_tokens_pkey;

-- 3. Promote the new id column to primary key.
ALTER TABLE user_push_tokens
  ADD PRIMARY KEY (id);

-- 4. Keep email indexed for fast lookups by owner.
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_email
  ON user_push_tokens (email);

-- 5. Unique constraint on (email, token) – prevents a device registering the
--    same push token twice for the same user account.
ALTER TABLE user_push_tokens
  ADD CONSTRAINT uq_user_push_tokens_email_token UNIQUE (email, token);

COMMIT;
