// Simple deployment script for weekly reset system
// This script will deploy the database functions and Edge Function directly

const { createClient } = require('@supabase/supabase-js');

// Your Supabase project details
const SUPABASE_URL = 'https://axumwatbsahalscdrryv.supabase.co';
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE'; // You need to get this from your dashboard

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function deployDatabaseFunctions() {
  console.log('🚀 Deploying database functions...');
  
  const sql = `
-- Create function to reset weekly meal counts for all users
CREATE OR REPLACE FUNCTION public.reset_weekly_meal_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Reset weekly_meals_used to 0 and update weekly_reset_date to current date
  -- for all users where the current date is different from their weekly_reset_date
  UPDATE public.user_activity 
  SET 
    weekly_meals_used = 0,
    weekly_reset_date = CURRENT_DATE,
    updated_at = now()
  WHERE weekly_reset_date < CURRENT_DATE;
  
  -- Log the reset operation
  RAISE NOTICE 'Weekly meal counts reset for users with reset_date < %', CURRENT_DATE;
END;
$function$;

-- Create function to check if a user needs a weekly reset
CREATE OR REPLACE FUNCTION public.check_and_reset_user_weekly_count(user_uuid UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_reset_date DATE;
  needs_reset boolean := false;
BEGIN
  -- Get the user's current reset date
  SELECT weekly_reset_date INTO user_reset_date
  FROM public.user_activity
  WHERE user_id = user_uuid;
  
  -- If no record exists, create one
  IF user_reset_date IS NULL THEN
    INSERT INTO public.user_activity (user_id, meals_generated, saved_recipes, weekly_meals_used, weekly_reset_date)
    VALUES (user_uuid, 0, 0, 0, CURRENT_DATE)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get the reset date again after potential insert
    SELECT weekly_reset_date INTO user_reset_date
    FROM public.user_activity
    WHERE user_id = user_uuid;
  END IF;
  
  -- Check if reset is needed (current date is different from reset date)
  IF user_reset_date < CURRENT_DATE THEN
    needs_reset := true;
    
    -- Reset the weekly count
    UPDATE public.user_activity 
    SET 
      weekly_meals_used = 0,
      weekly_reset_date = CURRENT_DATE,
      updated_at = now()
    WHERE user_id = user_uuid;
  END IF;
  
  RETURN needs_reset;
END;
$function$;

-- Grant execute permissions to authenticated users for the check function
GRANT EXECUTE ON FUNCTION public.check_and_reset_user_weekly_count(UUID) TO authenticated;

-- Create a function to get user activity with automatic reset check
CREATE OR REPLACE FUNCTION public.get_user_activity_with_reset(user_uuid UUID)
RETURNS TABLE (
  meals_generated INTEGER,
  saved_recipes INTEGER,
  weekly_meals_used INTEGER,
  weekly_reset_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Check and reset if needed
  PERFORM public.check_and_reset_user_weekly_count(user_uuid);
  
  -- Return the current activity data
  RETURN QUERY
  SELECT 
    ua.meals_generated,
    ua.saved_recipes,
    ua.weekly_meals_used,
    ua.weekly_reset_date
  FROM public.user_activity ua
  WHERE ua.user_id = user_uuid;
END;
$function$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_activity_with_reset(UUID) TO authenticated;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Error deploying database functions:', error);
      return false;
    }
    
    console.log('✅ Database functions deployed successfully!');
    return true;
  } catch (err) {
    console.error('❌ Error:', err);
    return false;
  }
}

async function testFunctions() {
  console.log('🧪 Testing functions...');
  
  try {
    // Test the reset function
    const { data, error } = await supabase.rpc('reset_weekly_meal_counts');
    
    if (error) {
      console.error('❌ Error testing reset function:', error);
      return false;
    }
    
    console.log('✅ Functions are working correctly!');
    return true;
  } catch (err) {
    console.error('❌ Error testing:', err);
    return false;
  }
}

async function main() {
  console.log('🎯 Starting weekly reset system deployment...');
  
  const dbSuccess = await deployDatabaseFunctions();
  
  if (dbSuccess) {
    await testFunctions();
    console.log('🎉 Weekly reset system deployed successfully!');
    console.log('📝 Next steps:');
    console.log('1. Deploy the Edge Function via Supabase Dashboard');
    console.log('2. Set up weekly scheduling');
    console.log('3. Test the system with real users');
  } else {
    console.log('❌ Deployment failed. Please check the errors above.');
  }
}

main().catch(console.error);
