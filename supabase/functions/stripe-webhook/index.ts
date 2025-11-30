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
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
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

  // Handle GET requests (for testing/health checks)
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ 
        message: 'Stripe webhook endpoint is active',
        note: 'This endpoint should only be called by Stripe. Use Stripe Dashboard to test webhooks.',
        status: 'ok'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Only process POST requests (from Stripe)
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Only POST requests are accepted.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get stripe-signature header (required for webhook verification)
    const signature = req.headers.get('stripe-signature');
    
    // Check for Stripe signature (required for webhook verification)
    // Note: verify_jwt = false in config.toml allows this endpoint to work without auth headers
    if (!signature) {
      console.error('❌ WEBHOOK ERROR: Missing stripe-signature header');
      return new Response(
        JSON.stringify({ 
          error: 'Missing stripe-signature header',
          message: 'This endpoint requires a valid Stripe webhook signature. Requests should come from Stripe, not directly from a browser.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if webhook secret is configured
    if (!webhookSecret) {
      console.error('❌ WEBHOOK ERROR: STRIPE_WEBHOOK_SECRET is not configured in Supabase');
      return new Response(
        JSON.stringify({ 
          error: 'Webhook secret not configured',
          message: 'STRIPE_WEBHOOK_SECRET environment variable is not set. Please configure it in Supabase Edge Function settings.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(
      supabaseUrl!,
      supabaseServiceKey!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      }
    );

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan as 'beginner' | 'chef' | 'unlimited';
        const isFreeTrial = session.metadata?.is_free_trial === 'true';
        const isUpgrade = session.metadata?.is_upgrade === 'true';
        const existingSubscriptionId = session.metadata?.existing_subscription_id;

        console.log('🔔 WEBHOOK: Processing checkout.session.completed', {
          sessionId: session.id,
          userId,
          plan,
          isFreeTrial,
          customer: session.customer,
          subscription: session.subscription,
          paymentStatus: session.payment_status,
          mode: session.mode,
          metadata: session.metadata
        });

        if (!userId) {
          console.error('❌ WEBHOOK ERROR: Missing userId in session metadata', {
            sessionId: session.id,
            availableMetadata: session.metadata
          });
          break;
        }

        if (!plan) {
          console.error('❌ WEBHOOK ERROR: Missing plan in session metadata', {
            sessionId: session.id,
            userId,
            availableMetadata: session.metadata
          });
          break;
        }

        // Use update first, then insert if needed to ensure all fields are reset
        const { data: existingSub, error: selectError } = await supabase
          .from('user_subscriptions')
          .select('user_id, plan, subscription_status')
          .eq('user_id', userId)
          .maybeSingle();

        if (selectError) {
          console.error('❌ WEBHOOK ERROR: Error checking existing subscription:', selectError);
          throw selectError;
        }

        console.log('📋 WEBHOOK: Existing subscription check:', {
          userId,
          exists: !!existingSub,
          currentPlan: existingSub?.plan,
          currentStatus: existingSub?.subscription_status
        });

        // Calculate period end from subscription if available, otherwise use 30 days
        let periodEnd: string;
        let cardFingerprint: string | null = null;
        if (session.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
            console.log('📅 WEBHOOK: Retrieved subscription period end:', periodEnd);
            
            // Get payment method to check card fingerprint for free trial validation
            if (subscription.default_payment_method) {
              const paymentMethod = await stripe.paymentMethods.retrieve(
                subscription.default_payment_method as string
              );
              if (paymentMethod.card?.fingerprint) {
                cardFingerprint = paymentMethod.card.fingerprint;
              }
            }
          } catch (err) {
            console.warn('⚠️ WEBHOOK: Could not retrieve subscription, using default 30 days:', err);
            periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          }
        } else {
          periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        // If this is a free trial, check both user and card restrictions
        if (isFreeTrial) {
          // Check 1: User/email has already used free trial (one-time per user)
          const { data: existingUserSub } = await supabase
            .from('user_subscriptions')
            .select('free_trial_used')
            .eq('user_id', userId)
            .maybeSingle();

          if (existingUserSub?.free_trial_used) {
            console.error('❌ WEBHOOK ERROR: User has already used free trial', {
              userId,
              subscriptionId: session.subscription
            });
            
            // Cancel the subscription since user already used free trial
            if (session.subscription) {
              try {
                await stripe.subscriptions.cancel(session.subscription as string);
                console.log('✅ WEBHOOK: Cancelled subscription due to user already using free trial');
              } catch (cancelError) {
                console.error('❌ WEBHOOK ERROR: Failed to cancel subscription:', cancelError);
              }
            }
            
            return new Response(
              JSON.stringify({ 
                received: false,
                error: 'You have already used your free trial. Free trial can only be used once per account.'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Check 2: Card has been used for free trial before (one-time per card)
          if (cardFingerprint) {
            const { data: existingCard } = await supabase
              .from('free_trial_cards')
              .select('id, user_id')
              .eq('card_fingerprint', cardFingerprint)
              .maybeSingle();

            if (existingCard) {
              console.error('❌ WEBHOOK ERROR: Card has already been used for free trial', {
                cardFingerprint,
                userId,
                previousUserId: existingCard.user_id,
                subscriptionId: session.subscription
              });
              
              // Cancel the subscription since the card was already used for free trial
              if (session.subscription) {
                try {
                  await stripe.subscriptions.cancel(session.subscription as string);
                  console.log('✅ WEBHOOK: Cancelled subscription due to duplicate free trial card');
                } catch (cancelError) {
                  console.error('❌ WEBHOOK ERROR: Failed to cancel subscription:', cancelError);
                }
              }
              
              // Don't proceed with subscription creation
              return new Response(
                JSON.stringify({ 
                  received: false,
                  error: 'This card has already been used for a free trial. Each card can only be used once for a free trial.'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } else {
              // Record that this card was used for free trial
              const { error: insertError } = await supabase
                .from('free_trial_cards')
                .insert({
                  card_fingerprint: cardFingerprint,
                  user_id: userId,
                });
              
              if (insertError) {
                console.error('❌ WEBHOOK ERROR: Failed to record free trial card:', insertError);
              } else {
                console.log('✅ WEBHOOK: Recorded free trial card usage', {
                  cardFingerprint,
                  userId
                });
              }
            }
          } else {
            console.warn('⚠️ WEBHOOK: Free trial requested but no card fingerprint available');
          }
        }

        const subscriptionData: any = {
          user_id: userId,
          plan: plan,
          source: 'stripe', // Important: mark as Stripe subscription
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_status: 'active', // Reset from 'revoked' if it was set by admin
          current_period_end: periodEnd,
          // Reset admin-related fields
          granted_by: null,
          granted_at: null,
          cancellation_requested_at: null,
          cancellation_cancelled_at: null,
        };

        // Mark free trial as used if this is a free trial
        if (isFreeTrial) {
          subscriptionData.free_trial_used = true;
          subscriptionData.free_trial_used_at = new Date().toISOString();
        }

        // If this is an upgrade via checkout (new subscription), cancel the old subscription
        if (isUpgrade && existingSubscriptionId && session.subscription) {
          try {
            // Get the old subscription ID from the database
            const { data: oldSub } = await supabase
              .from('user_subscriptions')
              .select('stripe_subscription_id')
              .eq('user_id', userId)
              .single();
            
            const oldSubscriptionId = oldSub?.stripe_subscription_id || existingSubscriptionId;
            
            if (oldSubscriptionId && oldSubscriptionId !== session.subscription) {
              console.log('🔄 WEBHOOK: Cancelling old subscription for upgrade:', {
                oldSubscriptionId: oldSubscriptionId,
                newSubscriptionId: session.subscription
              });
              
              await stripe.subscriptions.cancel(oldSubscriptionId);
              console.log('✅ WEBHOOK: Old subscription cancelled successfully');
            }
          } catch (cancelError) {
            console.error('❌ WEBHOOK ERROR: Failed to cancel old subscription:', cancelError);
            // Don't fail the whole process if cancelling old subscription fails
          }
        }

        if (existingSub) {
          // Update existing subscription
          console.log('🔄 WEBHOOK: Updating existing subscription:', {
            userId,
            oldPlan: existingSub.plan,
            newPlan: plan
          });

          const { data: updatedData, error: updateError } = await supabase
            .from('user_subscriptions')
            .update(subscriptionData)
            .eq('user_id', userId)
            .select();

          if (updateError) {
            console.error('❌ WEBHOOK ERROR: Error updating subscription:', {
              error: updateError,
              userId,
              plan,
              subscriptionData
            });
            throw updateError;
          }

          console.log('✅ WEBHOOK: Subscription updated successfully:', {
            userId,
            plan,
            source: 'stripe',
            updatedData: updatedData?.[0]
          });
        } else {
          // Insert new subscription
          console.log('➕ WEBHOOK: Inserting new subscription:', {
            userId,
            plan
          });

          const { data: insertedData, error: insertError } = await supabase
            .from('user_subscriptions')
            .insert(subscriptionData)
            .select();

          if (insertError) {
            console.error('❌ WEBHOOK ERROR: Error inserting subscription:', {
              error: insertError,
              userId,
              plan,
              subscriptionData
            });
            throw insertError;
          }

          console.log('✅ WEBHOOK: Subscription inserted successfully:', {
            userId,
            plan,
            source: 'stripe',
            insertedData: insertedData?.[0]
          });
        }

        // Verify the update was successful
        const { data: verifyData, error: verifyError } = await supabase
          .from('user_subscriptions')
          .select('plan, subscription_status, stripe_subscription_id')
          .eq('user_id', userId)
          .single();

        if (verifyError) {
          console.error('⚠️ WEBHOOK WARNING: Could not verify subscription update:', verifyError);
        } else {
          console.log('✅ WEBHOOK VERIFICATION: Subscription confirmed in database:', {
            userId,
            verifiedPlan: verifyData.plan,
            verifiedStatus: verifyData.subscription_status,
            verifiedStripeId: verifyData.stripe_subscription_id
          });
        }

        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Try to get userId from subscription metadata first
        let userId = subscription.metadata?.supabase_user_id;
        
        // If not in metadata, get it from customer_id in database
        if (!userId && subscription.customer) {
          const { data: subData } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', subscription.customer as string)
            .single();
          
          if (subData) {
            userId = subData.user_id;
          }
        }
        
        const plan = subscription.metadata?.plan as 'beginner' | 'chef' | 'unlimited';

        console.log('Processing subscription update/deletion:', {
          userId,
          plan,
          stripeStatus: subscription.status,
          subscriptionId: subscription.id,
          customerId: subscription.customer
        });

        if (userId) {
          // Map Stripe status to our subscription_status
          let status: string;
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            status = 'active';
          } else if (subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'incomplete_expired') {
            status = 'canceled';
          } else if (subscription.status === 'past_due' || subscription.status === 'incomplete') {
            status = 'past_due';
          } else {
            status = 'canceled'; // Default for other statuses
          }

          const updateData: any = {
            subscription_status: status,
            current_period_end: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
          };

          // If subscription is active, update plan from metadata and clear cancellation flags
          if (status === 'active') {
            // Update plan from Stripe metadata if available
            if (plan && ['beginner', 'chef', 'unlimited'].includes(plan)) {
              updateData.plan = plan;
            }
            
            // Clear cancellation flags if subscription is active and not set to cancel at period end
            if (!subscription.cancel_at_period_end) {
              updateData.cancellation_requested_at = null;
              updateData.cancellation_cancelled_at = null;
            } else {
              // If cancel_at_period_end is true, set cancellation_requested_at if not already set
              // This handles the case where cancellation was requested in Stripe but not in our DB
              const { data: existingSub } = await supabase
                .from('user_subscriptions')
                .select('cancellation_requested_at')
                .eq('user_id', userId)
                .single();
              
              if (existingSub && !existingSub.cancellation_requested_at) {
                updateData.cancellation_requested_at = new Date().toISOString();
              }
            }
          } else if (status === 'canceled') {
            // If subscription is canceled/deleted, downgrade to free but keep source as 'stripe'
            updateData.plan = 'free';
            updateData.cancellation_cancelled_at = new Date().toISOString();
            // Clear cancellation_requested_at since plan is now free (no active subscription to cancel)
            updateData.cancellation_requested_at = null;
          }

          const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update(updateData)
            .eq('user_id', userId);

          if (updateError) {
            console.error('Error updating subscription status:', updateError);
            throw updateError;
          }

          console.log('Subscription status updated:', { 
            userId, 
            status, 
            plan: updateData.plan || plan,
            cancel_at_period_end: subscription.cancel_at_period_end,
            cleared_cancellation: !subscription.cancel_at_period_end && status === 'active'
          });
        } else {
          console.error('Could not find userId for subscription:', subscription.id);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          let userId = subscription.metadata?.supabase_user_id;
          
          // If not in metadata, get it from customer_id in database
          if (!userId && subscription.customer) {
            const { data: subData } = await supabase
              .from('user_subscriptions')
              .select('user_id')
              .eq('stripe_customer_id', subscription.customer as string)
              .single();
            
            if (subData) {
              userId = subData.user_id;
            }
          }

          if (userId) {
            const updateData: any = {
              subscription_status: 'active',
              current_period_end: subscription.current_period_end 
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
            };

            // Clear cancellation flags if subscription is not set to cancel at period end
            if (!subscription.cancel_at_period_end) {
              updateData.cancellation_requested_at = null;
              updateData.cancellation_cancelled_at = null;
            }

            // Update plan from metadata if available
            const plan = subscription.metadata?.plan as 'beginner' | 'chef' | 'unlimited';
            if (plan && ['beginner', 'chef', 'unlimited'].includes(plan)) {
              updateData.plan = plan;
            }

            const { error: updateError } = await supabase
              .from('user_subscriptions')
              .update(updateData)
              .eq('user_id', userId);
              
            if (updateError) {
              console.error('Error updating subscription on payment succeeded:', updateError);
            } else {
              console.log('Subscription activated after payment:', { 
                userId,
                plan: updateData.plan || plan,
                cleared_cancellation: !subscription.cancel_at_period_end
              });
            }
          } else {
            console.error('Could not find userId for invoice payment succeeded:', subscriptionId);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          let userId = subscription.metadata?.supabase_user_id;
          
          // If not in metadata, get it from customer_id in database
          if (!userId && subscription.customer) {
            const { data: subData } = await supabase
              .from('user_subscriptions')
              .select('user_id')
              .eq('stripe_customer_id', subscription.customer as string)
              .single();
            
            if (subData) {
              userId = subData.user_id;
            }
          }

          if (userId) {
            const { error: updateError } = await supabase
              .from('user_subscriptions')
              .update({
                subscription_status: 'past_due',
              })
              .eq('user_id', userId);
              
            if (updateError) {
              console.error('Error updating subscription on payment failed:', updateError);
            }
          } else {
            console.error('Could not find userId for invoice payment failed:', subscriptionId);
          }
        }
        break;
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

