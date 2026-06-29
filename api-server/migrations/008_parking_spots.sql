-- Run in Supabase SQL editor (PRODUCTION project)
-- Community-verified parking spots.

CREATE TABLE IF NOT EXISTS parking_spots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_name      text NOT NULL,                 -- free-typed place, e.g. "ISKCON Temple, Kharghar"
  label         text,                          -- spot description, e.g. "Free street parking behind temple"
  lat           double precision NOT NULL,
  lng           double precision NOT NULL,
  type          text NOT NULL DEFAULT 'free',  -- free | paid | street | lot | other
  vehicle_types text DEFAULT 'car,bike',       -- comma list
  photo_url     text,
  submitted_by  text NOT NULL,
  status        text NOT NULL DEFAULT 'pending', -- pending | verified | community_verified | rejected
  upvotes       integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  verified_at   timestamptz
);

CREATE INDEX IF NOT EXISTS parking_spots_status_idx ON parking_spots(status);
CREATE INDEX IF NOT EXISTS parking_spots_submitted_by_idx ON parking_spots(submitted_by);

CREATE TABLE IF NOT EXISTS parking_votes (
  spot_id    uuid REFERENCES parking_spots(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  lat        double precision,
  lng        double precision,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (spot_id, user_email)
);
