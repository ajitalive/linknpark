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
