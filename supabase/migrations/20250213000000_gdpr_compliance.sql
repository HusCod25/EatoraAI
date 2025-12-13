-- Add GDPR compliance fields to profiles table
-- This migration adds email storage and consent tracking for EU GDPR compliance

-- NOTE: marketing_opt_in already exists from migration 20250825091026
-- We're NOT creating it again, just adding the timestamp tracking fields

-- Add email field to profiles table (for easy access without querying auth.users)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add GDPR consent timestamp fields (marketing_opt_in already exists)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS withdrawal_waiver_accepted_at TIMESTAMP WITH TIME ZONE;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Update the handle_new_user_complete function to include email and consents
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  -- Insert profile with username, email, and consent data from metadata
  INSERT INTO public.profiles (
    user_id, 
    username, 
    email,
    marketing_opt_in,
    terms_accepted_at,
    privacy_accepted_at,
    marketing_consent_at,
    withdrawal_waiver_accepted_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NULL),
    NEW.email, -- Get email from auth.users
    COALESCE((NEW.raw_user_meta_data ->> 'marketing_opt_in')::boolean, false),
    -- Set consent timestamps to now if user accepted during signup
    CASE WHEN NEW.raw_user_meta_data ->> 'terms_accepted' = 'true' THEN now() ELSE NULL END,
    CASE WHEN NEW.raw_user_meta_data ->> 'privacy_accepted' = 'true' THEN now() ELSE NULL END,
    CASE WHEN (NEW.raw_user_meta_data ->> 'marketing_opt_in')::boolean = true THEN now() ELSE NULL END,
    CASE WHEN NEW.raw_user_meta_data ->> 'withdrawal_waiver_accepted' = 'true' THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert subscription (handle conflict if exists)
  INSERT INTO public.user_subscriptions (user_id, plan)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert user activity with all zeros (handle conflict if exists)
  INSERT INTO public.user_activity (user_id, meals_generated, saved_recipes, weekly_meals_used, weekly_reset_date)
  VALUES (NEW.id, 0, 0, 0, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user_complete for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Create a function to update email when it changes in auth.users
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  -- Update email in profiles when it changes in auth.users
  UPDATE public.profiles
  SET email = NEW.email,
      updated_at = now()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to sync email changes
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_user_email();

-- Backfill email for existing users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND p.email IS NULL;

-- Add comment to document the GDPR compliance
COMMENT ON COLUMN public.profiles.email IS 'User email synced from auth.users for easy access';
COMMENT ON COLUMN public.profiles.terms_accepted_at IS 'Timestamp when user accepted Terms & Conditions (GDPR compliance)';
COMMENT ON COLUMN public.profiles.privacy_accepted_at IS 'Timestamp when user accepted Privacy Policy (GDPR compliance)';
COMMENT ON COLUMN public.profiles.marketing_consent_at IS 'Timestamp when user consented to marketing emails (GDPR compliance)';
COMMENT ON COLUMN public.profiles.withdrawal_waiver_accepted_at IS 'Timestamp when user waived 14-day withdrawal right (EU Consumer Rights Directive compliance)';
COMMENT ON COLUMN public.profiles.marketing_opt_in IS 'Boolean flag for marketing consent - EXISTING FIELD from earlier migration (GDPR compliance)';

