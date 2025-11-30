-- Complete cleanup of all admin functions
-- Run this FIRST before applying the migration

-- Drop all possible variations of admin functions
DROP FUNCTION IF EXISTS public.admin_grant_subscription(UUID, TEXT, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS public.admin_grant_subscription(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.admin_grant_subscription(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_grant_subscription(UUID);

DROP FUNCTION IF EXISTS public.admin_revoke_subscription(UUID);
DROP FUNCTION IF EXISTS public.admin_revoke_subscription(UUID, TEXT);

DROP FUNCTION IF EXISTS public.admin_make_admin(UUID);
DROP FUNCTION IF EXISTS public.admin_make_admin(UUID, TEXT);

DROP FUNCTION IF EXISTS public.admin_remove_admin(UUID);
DROP FUNCTION IF EXISTS public.admin_remove_admin(UUID, TEXT);

DROP FUNCTION IF EXISTS public.admin_toggle_admin_role(UUID);
DROP FUNCTION IF EXISTS public.admin_toggle_admin_role(UUID, BOOLEAN);

DROP FUNCTION IF EXISTS public.bootstrap_admin(UUID);
DROP FUNCTION IF EXISTS public.bootstrap_admin(UUID, TEXT);

-- Drop any existing policies
DROP POLICY IF EXISTS "Admins can manage any subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can manage their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admin subscription management" ON public.user_subscriptions;

-- Check what functions still exist (for debugging)
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname LIKE '%admin%'
ORDER BY p.proname;
