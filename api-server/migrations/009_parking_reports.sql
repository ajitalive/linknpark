-- Community parking: "disagree / report" mechanism.
-- A spot that collects enough reports is flagged (hidden from nearby) and
-- sent back to admin review.

ALTER TABLE public.parking_spots
  ADD COLUMN IF NOT EXISTS report_count int NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.parking_reports (
  spot_id    uuid        NOT NULL REFERENCES public.parking_spots(id) ON DELETE CASCADE,
  user_email text        NOT NULL,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spot_id, user_email)   -- one report per user per spot
);

-- Roles the API uses (service_role bypasses RLS; grants needed regardless)
GRANT ALL ON TABLE public.parking_reports TO service_role, anon, authenticated;
GRANT ALL ON TABLE public.parking_spots   TO service_role, anon, authenticated;
