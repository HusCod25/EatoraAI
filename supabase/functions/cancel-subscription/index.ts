import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get action and optional password
    const { password, action } = await req.json();

    if (action !== 'cancel' && action !== 'reactivate') {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "cancel" or "reactivate"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Password is only required for cancellation, not for reactivation
    if (action === 'cancel') {
      if (!password) {
        return new Response(
          JSON.stringify({ error: 'Password is required to cancel subscription' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: password,
      });

      if (signInError) {
        return new Response(
          JSON.stringify({ error: 'Invalid password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id, stripe_customer_id, cancellation_requested_at, current_period_end')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow cancellation/reactivation for Stripe subscriptions
    if (!subscription.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'This subscription cannot be cancelled through this method' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If current_period_end is missing, fetch it from Stripe
    let currentPeriodEnd = subscription.current_period_end;
    if (!currentPeriodEnd) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
        if (stripeSub.current_period_end) {
          currentPeriodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();
          // Update database with period end
          await supabase
            .from('user_subscriptions')
            .update({ current_period_end: currentPeriodEnd })
            .eq('user_id', user.id);
        }
      } catch (err) {
        console.warn('Could not fetch period end from Stripe:', err);
      }
    }

    if (action === 'cancel') {
      // Check if already cancelled
      if (subscription.cancellation_requested_at) {
        return new Response(
          JSON.stringify({ error: 'Subscription is already scheduled for cancellation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Cancel subscription at period end in Stripe
      const stripeSubscription = await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          cancel_at_period_end: true,
        }
      );

      // Get the period end date from Stripe subscription
      const periodEndDate = stripeSubscription.current_period_end 
        ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
        : currentPeriodEnd;

      // Update database with cancellation date and period end
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          cancellation_requested_at: new Date().toISOString(),
          current_period_end: periodEndDate,
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        // Try to revert Stripe change
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: false,
        });
        throw updateError;
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Subscription will be cancelled at the end of the current billing period',
          cancel_at: stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000).toISOString() : subscription.current_period_end
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Reactivate subscription
      if (!subscription.cancellation_requested_at) {
        return new Response(
          JSON.stringify({ error: 'Subscription is not scheduled for cancellation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Reactivate subscription in Stripe
      const stripeSubscription = await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          cancel_at_period_end: false,
        }
      );

      // Update database
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          cancellation_requested_at: null,
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Subscription reactivated successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ ERROR managing subscription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

