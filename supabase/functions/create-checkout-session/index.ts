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
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400',
};

type PaidPlanKey = 'beginner' | 'chef' | 'unlimited';
type BillingInterval = 'monthly' | 'yearly';

// Plan price IDs from Stripe (you'll need to create these in Stripe Dashboard)
const PLAN_PRICE_IDS: Record<BillingInterval, Record<PaidPlanKey, string>> = {
  monthly: {
    beginner: Deno.env.get('STRIPE_PRICE_ID_BEGINNER') || '',
    chef: Deno.env.get('STRIPE_PRICE_ID_CHEF') || '',
    unlimited: Deno.env.get('STRIPE_PRICE_ID_UNLIMITED') || '',
  },
  yearly: {
    beginner: Deno.env.get('STRIPE_PRICE_ID_BEGINNER_YEARLY') || '',
    chef: Deno.env.get('STRIPE_PRICE_ID_CHEF_YEARLY') || '',
    unlimited: Deno.env.get('STRIPE_PRICE_ID_UNLIMITED_YEARLY') || '',
  }
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

    const { plan, successUrl, cancelUrl, isFreeTrial, billingInterval } = await req.json();

    if (!plan || !['beginner', 'chef', 'unlimited'].includes(plan)) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const planKey = plan as PaidPlanKey;
    const normalizedInterval: BillingInterval = billingInterval === 'yearly' ? 'yearly' : 'monthly';

    // Free trial is only available for beginner plan
    if (isFreeTrial && planKey !== 'beginner') {
      return new Response(
        JSON.stringify({ error: 'Free trial is only available for the beginner plan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (isFreeTrial && normalizedInterval === 'yearly') {
      return new Response(
        JSON.stringify({ error: 'Free trial is only available on monthly billing.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has already used free trial (one-time per email/user)
    if (isFreeTrial) {
      const { data: userSubscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('free_trial_used')
        .eq('user_id', user.id)
        .maybeSingle();

      // Handle case where free_trial_used column might not exist yet (graceful fallback)
      if (subError && subError.code === '42703') {
        console.warn('free_trial_used column not found, allowing trial (migration may not be applied)');
      } else if (userSubscription?.free_trial_used) {
        return new Response(
          JSON.stringify({ 
            error: 'You have already used your free trial. Free trial can only be used once per account/email address.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const priceId = PLAN_PRICE_IDS[normalizedInterval][planKey];
    if (!priceId) {
      console.error(`❌ ERROR: Price ID not configured for plan: ${planKey} (${normalizedInterval})`);
      console.error(`Environment variables: STRIPE_PRICE_ID_${planKey.toUpperCase()}${normalizedInterval === 'yearly' ? '_YEARLY' : ''}=${Deno.env.get(`STRIPE_PRICE_ID_${planKey.toUpperCase()}${normalizedInterval === 'yearly' ? '_YEARLY' : ''}`) || 'NOT SET'}`);
      return new Response(
        JSON.stringify({ 
          error: `Price ID not configured for the ${planKey} (${normalizedInterval}) plan. Please contact support.`,
          details: `STRIPE_PRICE_ID_${planKey.toUpperCase()}${normalizedInterval === 'yearly' ? '_YEARLY' : ''} environment variable is not set.`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user subscription data
    const { data: userSubscription, error: userSubscriptionError } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, plan, cancellation_requested_at, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    if (userSubscriptionError) {
      console.error('❌ ERROR fetching user subscription:', userSubscriptionError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscription data. Please try again or contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let customerId = userSubscription?.stripe_customer_id;

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      customerId = customer.id;

      // Save customer ID to database
      await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
        }, {
          onConflict: 'user_id'
        });
    }

    // Check if subscription period has ended
    const isSubscriptionPeriodEnded = userSubscription?.current_period_end 
      ? new Date(userSubscription.current_period_end) < new Date()
      : false;

    // If user has a paid subscription (active or cancelled) and is changing plans
    if (userSubscription?.stripe_subscription_id && 
        userSubscription.plan !== 'free' &&
        userSubscription.plan !== planKey) {
      // Check if this is an upgrade (plan prices)
      const planPrices: Record<string, number> = {
        'free': 0,
        'beginner': 4.99,
        'chef': 14.99,
        'unlimited': 29.99,
      };
      
      const currentPrice = planPrices[userSubscription.plan] || 0;
      const newPrice = planPrices[planKey] || 0;
      const isUpgrade = newPrice > currentPrice;
      
      // If subscription period has ended, allow any plan change (downgrades included)
      if (isSubscriptionPeriodEnded) {
        // Period has ended - create new subscription or update accordingly
        // For now, allow creating a new checkout session for any plan
        // The webhook will handle setting up the new subscription
      } else if (isUpgrade) {
        // Only allow upgrades while subscription period hasn't ended (even if cancelled)
        // Always redirect to Stripe checkout for upgrades to ensure payment confirmation
        console.log('🔄 Upgrade requested, redirecting to Stripe checkout');
        
        try {
          // Create checkout session for upgrade
          // This ensures users always go through Stripe checkout for upgrades
          const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{
              price: priceId,
              quantity: 1,
            }],
            subscription_data: {
              metadata: {
                supabase_user_id: user.id,
                plan: planKey,
                is_upgrade: 'true',
                billing_interval: normalizedInterval,
                existing_subscription_id: userSubscription.stripe_subscription_id,
              },
            },
            success_url: successUrl || `${req.headers.get('origin')}/account?success=true&upgraded=true`,
            cancel_url: cancelUrl || `${req.headers.get('origin')}/account?canceled=true`,
            metadata: {
              supabase_user_id: user.id,
              plan: planKey,
              is_upgrade: 'true',
              billing_interval: normalizedInterval,
            },
          });

          return new Response(
            JSON.stringify({ 
              url: session.url
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (checkoutError) {
          console.error('❌ ERROR creating checkout session for upgrade:', checkoutError);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to start upgrade checkout. Please try again or contact support.',
              details: checkoutError instanceof Error ? checkoutError.message : 'Unknown error'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // This is a downgrade, and subscription period hasn't ended yet
        // Block downgrades even if subscription is cancelled - must wait until period ends
        const periodEndDate = userSubscription.current_period_end 
          ? new Date(userSubscription.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : 'the end of the billing period';
        return new Response(
          JSON.stringify({ 
            error: `Cannot downgrade to a cheaper plan until your subscription period ends on ${periodEndDate}. Even if your subscription is cancelled, you must wait until the billing period ends. You can only upgrade to a more expensive plan until then.`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create checkout session
    const sessionConfig: any = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${req.headers.get('origin')}/account?success=true`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/account?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan: planKey,
        is_free_trial: isFreeTrial ? 'true' : 'false',
        billing_interval: normalizedInterval,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan: planKey,
          is_free_trial: isFreeTrial ? 'true' : 'false',
          billing_interval: normalizedInterval,
        },
      },
    };

    // Add 15-day trial period for beginner plan free trial
    if (isFreeTrial && plan === 'beginner') {
      sessionConfig.subscription_data.trial_period_days = 15;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ ERROR creating checkout session:', error);
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

