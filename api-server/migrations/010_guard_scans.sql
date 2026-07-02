-- Society parking management: log every Guard Mode vehicle lookup so the
-- society office dashboard can review guard activity.

CREATE TABLE IF NOT EXISTS public.guard_scans (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  guard_email  text        NOT NULL,
  query        text        NOT NULL,      -- what the guard typed/scanned
  matched_code text,                      -- sticker code if found, else null
  found        boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guard_scans_created_idx ON public.guard_scans(created_at DESC);

GRANT ALL ON TABLE public.guard_scans TO service_role, anon, authenticated;
