-- Add budgeting settings to user profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS budgeting_enabled BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_budgeting ON public.profiles(user_id, budgeting_enabled);

-- Comment on columns
COMMENT ON COLUMN public.profiles.country IS 'User country for budgeting calculations';
COMMENT ON COLUMN public.profiles.currency IS 'Preferred currency for budgeting (ISO 4217 code)';
COMMENT ON COLUMN public.profiles.budgeting_enabled IS 'Whether user has set up budgeting feature';
