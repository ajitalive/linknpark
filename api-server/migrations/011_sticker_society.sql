-- Society parking management: vehicle registrations must carry the
-- owner's society name (parking_slot column already exists).

ALTER TABLE public.stickers ADD COLUMN IF NOT EXISTS society text;
