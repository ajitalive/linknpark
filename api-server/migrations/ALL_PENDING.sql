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
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS chat_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id   uuid REFERENCES incidents(id) ON DELETE CASCADE,
  visitor_token text NOT NULL,
  status        text NOT NULL DEFAULT 'active',
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_sessions_incident_idx ON chat_sessions(incident_id);
CREATE INDEX IF NOT EXISTS chat_sessions_visitor_token_idx ON chat_sessions(visitor_token);

CREATE TABLE IF NOT EXISTS chat_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_type  text NOT NULL, -- 'visitor' or 'owner'
  content      text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages(session_id);
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
