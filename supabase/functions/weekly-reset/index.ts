import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting weekly reset process...');
    
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Call the database function to reset weekly meal counts
    const { data, error } = await supabase.rpc('reset_weekly_meal_counts');

    if (error) {
      console.error('Error resetting weekly meal counts:', error);
      throw error;
    }

    console.log('Weekly reset completed successfully');

    // Get count of users that were reset (optional logging)
    const { data: resetCount, error: countError } = await supabase
      .from('user_activity')
      .select('user_id', { count: 'exact' })
      .eq('weekly_reset_date', new Date().toISOString().split('T')[0]);

    if (countError) {
      console.warn('Could not get reset count:', countError);
    } else {
      console.log(`Reset completed for ${resetCount?.length || 0} users`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Weekly reset completed successfully',
      resetDate: new Date().toISOString().split('T')[0],
      usersReset: resetCount?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in weekly-reset function:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = {
      error: errorMessage,
      timestamp: new Date().toISOString(),
      type: error instanceof Error ? error.constructor.name : 'Unknown'
    };
    
    return new Response(JSON.stringify(errorDetails), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
