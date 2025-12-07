import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export type SubscriptionPlan = 'free' | 'beginner' | 'chef' | 'unlimited' | 'admin';

export interface PlanLimits {
  meals_per_week: number | null;
  max_ingredients: number | null;
  max_saved_meals: number | null;
  has_advanced_recipes: boolean;
  has_personalized_suggestions: boolean;
  has_personalized_themes: boolean;
}

export interface UserSubscription {
  plan: SubscriptionPlan;
  subscription_status: string;
  current_period_end: string | null;
  cancellation_requested_at: string | null;
  stripe_subscription_id: string | null;
  free_trial_used: boolean | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
    } else {
      setSubscription(null);
      setPlanLimits(null);
      setLoading(false);
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      
      // Fetch user subscription
      // Trigger should create subscription automatically, so we just fetch it
      // Try with free_trial_used first, fallback if column doesn't exist (migration not applied)
      let { data: subData, error: subError } = await supabase
        .from("user_subscriptions")
        .select("plan, subscription_status, current_period_end, cancellation_requested_at, stripe_subscription_id, free_trial_used")
        .eq("user_id", user.id)
        .maybeSingle();

      // If error is because free_trial_used column doesn't exist, retry without it
      if (subError && subError.code === '42703' && subError.message?.includes('free_trial_used')) {
        logger.warn("free_trial_used column doesn't exist yet, fetching without it");
        const retryResult = await supabase
          .from("user_subscriptions")
          .select("plan, subscription_status, current_period_end, cancellation_requested_at, stripe_subscription_id")
          .eq("user_id", user.id)
          .maybeSingle();
        subData = retryResult.data;
        subError = retryResult.error;
        // Add default free_trial_used value
        if (subData) {
          subData.free_trial_used = false;
        }
      }

      // If no subscription exists and it's not a "not found" error, log it
      if (subError && subError.code !== "PGRST116") {
        logger.error("Error fetching subscription:", subError);
        // Don't throw - maybe trigger hasn't run yet, set free plan as fallback
        setSubscription({
          plan: 'free',
          subscription_status: 'active',
          current_period_end: null,
          cancellation_requested_at: null,
          stripe_subscription_id: null,
          free_trial_used: false
        });
      } else if (!subData) {
        // No subscription found - trigger should create it, but set free plan as fallback
        // This shouldn't happen if trigger works correctly
        logger.warn("No subscription found for user, trigger should have created it");
        setSubscription({
          plan: 'free',
          subscription_status: 'active',
          current_period_end: null,
          cancellation_requested_at: null,
          stripe_subscription_id: null,
          free_trial_used: false
        });
      } else {
        // Subscription exists, use it
        setSubscription(subData);
      }

      // Fetch plan limits (using cached function for better performance)
      const currentPlan = subData?.plan || 'free';
      const { data: limitsData, error: limitsError } = await supabase.rpc('get_plan_limits_cached', {
        p_plan: currentPlan
      });

      if (limitsError) {
        logger.error("Error fetching plan limits (cached):", limitsError);
        // Fallback to direct query
        const { data: fallbackLimits, error: fallbackError } = await supabase
          .from("plan_limits")
          .select("*")
          .eq("plan", currentPlan)
          .single();

        if (fallbackError) {
          logger.error("Error fetching plan limits (fallback):", fallbackError);
        } else {
          setPlanLimits(fallbackLimits);
        }
      } else if (limitsData) {
        setPlanLimits(limitsData);
      }

    } catch (error) {
      logger.error("Error fetching subscription data:", error);
      // Set fallback values on error
      setSubscription({
        plan: 'free',
        subscription_status: 'active',
        current_period_end: null,
        cancellation_requested_at: null,
        stripe_subscription_id: null
      });
    } finally {
      setLoading(false);
    }
  };

  const checkLimit = (limitType: keyof PlanLimits, currentUsage: number): boolean => {
    if (!planLimits) return false;
    
    const limit = planLimits[limitType];
    if (limit === null || limit === true) return true; // Unlimited or feature enabled
    if (typeof limit === 'boolean') return limit;
    if (typeof limit === 'number') return currentUsage < limit;
    
    return false;
  };

  const getCurrentPlanDisplay = () => {
    if (!subscription) return { name: 'Free Plan', price: '€0' };
    
    const planDisplayMap: Record<SubscriptionPlan, { name: string; price: string }> = {
      free: { name: 'Free Plan', price: '€0' },
      beginner: { name: 'Beginner Plan', price: '€4.99/month' },
      chef: { name: 'Chef Plan', price: '€9.99/month' },
      unlimited: { name: 'Unlimited Plan', price: '€29.99/month' },
      admin: { name: 'Admin', price: 'Admin Access' }
    };

    return planDisplayMap[subscription.plan];
  };

  const hasFeature = (feature: 'advanced_recipes' | 'personalized_suggestions' | 'personalized_themes'): boolean => {
    if (!planLimits) return false;
    
    const featureMap = {
      'advanced_recipes': 'has_advanced_recipes',
      'personalized_suggestions': 'has_personalized_suggestions',
      'personalized_themes': 'has_personalized_themes'
    } as const;

    return planLimits[featureMap[feature]] || false;
  };

  return {
    subscription,
    planLimits,
    loading,
    checkLimit,
    getCurrentPlanDisplay,
    hasFeature,
    refreshSubscription: fetchSubscriptionData
  };
};