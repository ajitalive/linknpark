-- Run this in Supabase SQL editor (on the PRODUCTION project: bamyfadmoviffydpjabv)
-- Adds geo columns so zones are location-based and admin-seeded.

ALTER TABLE zones ADD COLUMN IF NOT EXISTS lat        double precision;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS lng        double precision;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS radius_km  double precision DEFAULT 2;
