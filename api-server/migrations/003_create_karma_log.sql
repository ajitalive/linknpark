-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS karma_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  text NOT NULL,
  incident_id uuid REFERENCES incidents(id) ON DELETE SET NULL,
  points      integer NOT NULL,
  reason      text NOT NULL, -- 'reported', 'resolved_bonus'
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS karma_log_user_email_idx ON karma_log(user_email);

-- Also add reporter_email to incidents so we can credit the bonus later
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reporter_email text;
