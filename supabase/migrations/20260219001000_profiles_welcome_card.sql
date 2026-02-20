-- Migration: Add welcome card tracking on profiles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS welcome_card_seen_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.welcome_card_seen_at IS 'Timestamp when the user dismissed the first-time welcome card. NULL = show welcome card.';
