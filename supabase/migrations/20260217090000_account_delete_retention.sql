-- Account deletion retention: keep data for 10 days to prevent abuse
-- This migration adds a retention table used when users delete accounts
-- and then sign up again with the same email within 10 days.

CREATE TABLE IF NOT EXISTS public.deleted_user_retention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  old_user_id UUID NOT NULL,
  profile_data JSONB,
  subscription_data JSONB,
  activity_data JSONB,
  saved_meals_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 days'),
  restored BOOLEAN NOT NULL DEFAULT false
);

-- Indexes to quickly find retention records by email and expiry
CREATE INDEX IF NOT EXISTS idx_deleted_user_retention_email
  ON public.deleted_user_retention(email);

CREATE INDEX IF NOT EXISTS idx_deleted_user_retention_expires_at
  ON public.deleted_user_retention(expires_at);

-- RLS: this table contains sensitive snapshots and should never be
-- directly accessible to normal users. It is only used from
-- service-role edge functions and SECURITY DEFINER triggers.
ALTER TABLE public.deleted_user_retention ENABLE ROW LEVEL SECURITY;

-- Allow only admin users (plan = 'admin') to read rows, e.g. for
-- debugging, and block all other direct access from clients.
CREATE POLICY "Admins can view deleted_user_retention"
ON public.deleted_user_retention
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_subscriptions
    WHERE user_id = auth.uid() AND plan = 'admin'
  )
);

COMMENT ON TABLE public.deleted_user_retention IS 'Temporarily stores deleted user data (10 days) to prevent abuse when re-registering with same email.';
COMMENT ON COLUMN public.deleted_user_retention.email IS 'Email of the deleted account (used to match on new signup).';
COMMENT ON COLUMN public.deleted_user_retention.old_user_id IS 'Original auth.users.id of the deleted account.';
COMMENT ON COLUMN public.deleted_user_retention.expires_at IS 'Timestamp after which the retained data can be safely purged.';
COMMENT ON COLUMN public.deleted_user_retention.restored IS 'Whether this retention snapshot was already used to restore / carry over limits for a new account.';
