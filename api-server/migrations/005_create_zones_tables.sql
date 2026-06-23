-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS zones (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  area       text NOT NULL,
  created_by text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zone_members (
  zone_id    uuid REFERENCES zones(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  joined_at  timestamptz DEFAULT now(),
  PRIMARY KEY (zone_id, user_email)
);

CREATE INDEX IF NOT EXISTS zone_members_email_idx ON zone_members(user_email);
