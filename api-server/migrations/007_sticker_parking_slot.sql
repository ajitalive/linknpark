-- Run this in Supabase SQL editor (PRODUCTION project: bamyfadmoviffydpjabv)
-- Links a vehicle to its assigned parking slot for Guard Mode.

ALTER TABLE stickers ADD COLUMN IF NOT EXISTS parking_slot text;

CREATE INDEX IF NOT EXISTS stickers_parking_slot_idx ON stickers(parking_slot);
