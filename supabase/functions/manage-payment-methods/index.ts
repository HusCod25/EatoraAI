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
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

    // Get user's subscription to find Stripe customer ID
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No Stripe customer found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'GET') {
      // List payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: subscription.stripe_customer_id,
        type: 'card',
      });

      // Format payment methods for frontend
      const formattedMethods = paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year,
        } : null,
        is_default: false, // We'll check this separately
      }));

      // Get default payment method from customer
      const customer = await stripe.customers.retrieve(subscription.stripe_customer_id);
      if (customer && !customer.deleted && 'invoice_settings' in customer) {
        const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;
        if (defaultPaymentMethodId) {
          formattedMethods.forEach(pm => {
            if (pm.id === defaultPaymentMethodId) {
              pm.is_default = true;
            }
          });
        }
      }

      // Deduplicate payment methods based on card details (last4, brand, exp_month, exp_year)
      const uniqueMethods = formattedMethods.reduce((acc, current) => {
        if (!current.card) {
          // If no card info, keep it (shouldn't happen for card type)
          acc.push(current);
          return acc;
        }

        // Check if we already have a payment method with the same card details
        const existing = acc.find(pm => 
          pm.card &&
          pm.card.last4 === current.card?.last4 &&
          pm.card.brand === current.card?.brand &&
          pm.card.exp_month === current.card?.exp_month &&
          pm.card.exp_year === current.card?.exp_year
        );

        if (!existing) {
          // This is a new unique card, add it
          acc.push(current);
        } else {
          // Duplicate found - keep the one that's default or the one with the most recent ID
          // If current is default, replace existing
          if (current.is_default && !existing.is_default) {
            const index = acc.indexOf(existing);
            acc[index] = current;
          }
          // If both are default or neither, keep the existing one (first occurrence)
        }

        return acc;
      }, [] as typeof formattedMethods);

      return new Response(
        JSON.stringify({ paymentMethods: uniqueMethods }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      // Create setup intent for adding new payment method
      const { action } = await req.json();

      if (action === 'create_setup_intent') {
        const setupIntent = await stripe.setupIntents.create({
          customer: subscription.stripe_customer_id,
          payment_method_types: ['card'],
        });

        return new Response(
          JSON.stringify({ 
            clientSecret: setupIntent.client_secret,
            setupIntentId: setupIntent.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'set_default') {
        const { paymentMethodId } = await req.json();
        
        await stripe.customers.update(subscription.stripe_customer_id, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        return new Response(
          JSON.stringify({ success: true, message: 'Default payment method updated' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (req.method === 'DELETE') {
      // Remove payment method
      const url = new URL(req.url);
      const paymentMethodId = url.searchParams.get('payment_method_id');

      if (!paymentMethodId) {
        return new Response(
          JSON.stringify({ error: 'Payment method ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await stripe.paymentMethods.detach(paymentMethodId);

      return new Response(
        JSON.stringify({ success: true, message: 'Payment method removed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ ERROR managing payment methods:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

