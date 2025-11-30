-- Apply free trial tracking migration
-- Run this in your Supabase SQL Editor

-- Add free trial tracking to user_subscriptions table
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS free_trial_used BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS free_trial_used_at TIMESTAMPTZ;

-- Create table to track free trial usage by card (fingerprint)
CREATE TABLE IF NOT EXISTS public.free_trial_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_fingerprint TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.free_trial_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own free trial card records
DROP POLICY IF EXISTS "Users can view their own free trial card records" ON public.free_trial_cards;
CREATE POLICY "Users can view their own free trial card records" 
ON public.free_trial_cards 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow service role to insert (for webhook)
-- Note: Service role bypasses RLS, so this is mainly for documentation

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_free_trial_cards_fingerprint ON public.free_trial_cards(card_fingerprint);
CREATE INDEX IF NOT EXISTS idx_free_trial_cards_user_id ON public.free_trial_cards(user_id);

