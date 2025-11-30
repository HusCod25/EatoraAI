import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Star, Zap, Crown, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useState } from "react";
import { toast } from "sonner";

interface PricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings?: () => void;
}

export const PricingDialog = ({ open, onOpenChange, onOpenSettings }: PricingDialogProps) => {
  const { subscription, refreshSubscription } = useSubscription();
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const isYearly = billingInterval === 'yearly';

  // Check if user has an active paid subscription (not cancelled)
  const hasActivePaidSubscription = subscription && 
    subscription.plan !== 'free' && 
    subscription.plan !== 'admin' &&
    !subscription.cancellation_requested_at &&
    subscription.stripe_subscription_id;

  // Check if subscription is cancelled (cancellation requested)
  const isSubscriptionCancelled = subscription?.cancellation_requested_at !== null;
  
  // Check if subscription period has ended (current_period_end is in the past)
  const isSubscriptionPeriodEnded = subscription?.current_period_end 
    ? new Date(subscription.current_period_end) < new Date()
    : false;

  // Plan price hierarchy (from cheapest to most expensive)
  const planPrices: Record<string, number> = {
    'free': 0,
    'beginner': 4.99,
    'chef': 14.99,
    'unlimited': 29.99,
    'admin': 999 // Admin is highest (cannot upgrade from)
  };

  // Check if a plan change is an upgrade (more expensive) or downgrade (cheaper)
  const isUpgrade = (fromPlan: string, toPlan: string): boolean => {
    const fromPrice = planPrices[fromPlan] || 0;
    const toPrice = planPrices[toPlan] || 0;
    return toPrice > fromPrice;
  };

  // Check if a plan change is allowed
  const canChangeToPlan = (targetPlan: string): boolean => {
    if (!subscription) return true; // No subscription, allow any plan
    if (subscription.plan === targetPlan) return false; // Already on this plan
    
    // If subscription period has ended, allow any plan change (downgrades included)
    if (isSubscriptionPeriodEnded) return true;
    
    // Check if user has a paid subscription (active or cancelled) that hasn't ended yet
    const hasPaidSubscriptionWithActivePeriod = subscription && 
      subscription.plan !== 'free' && 
      subscription.plan !== 'admin' &&
      subscription.stripe_subscription_id &&
      !isSubscriptionPeriodEnded;
    
    // If user has a paid subscription with active period (even if cancelled),
    // only allow upgrades (more expensive plans)
    if (hasPaidSubscriptionWithActivePeriod) {
      return isUpgrade(subscription.plan, targetPlan);
    }
    
    // If no active paid subscription period, allow any plan
    return true;
  };

  const handleCheckout = async (
    planKey: 'beginner' | 'chef' | 'unlimited',
    isFreeTrial: boolean = false,
    interval: 'monthly' | 'yearly' = 'monthly'
  ) => {
    if (!user) {
      toast.error("Please sign in to upgrade your plan");
      return;
    }

    // Prevent downgrades if user has an active paid subscription (only allow upgrades)
    if (hasActivePaidSubscription && subscription) {
      if (!isUpgrade(subscription.plan, planKey) && planKey !== 'free') {
        toast.error("You cannot downgrade to a cheaper plan while you have an active subscription. You can only upgrade to a more expensive plan. To downgrade, please cancel your subscription first.");
        if (onOpenSettings) {
          onOpenChange(false);
          setTimeout(() => {
            onOpenSettings();
          }, 100);
        }
        return;
      }
      
      // Prevent downgrading to free plan - redirect to cancel subscription
      if (planKey === 'free') {
        toast.error("To downgrade to the free plan, please cancel your subscription first.");
        if (onOpenSettings) {
          onOpenChange(false);
          setTimeout(() => {
            onOpenSettings();
          }, 100);
        }
        return;
      }
    }

    const billingIntervalToUse = isFreeTrial ? 'monthly' : interval;

    setLoading(isFreeTrial ? 'trial' : planKey);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to upgrade your plan");
        return;
      }

      // Call the checkout session creation function
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          plan: planKey,
          isFreeTrial: isFreeTrial,
          billingInterval: billingIntervalToUse,
          successUrl: `${window.location.origin}/account?success=true`,
          cancelUrl: `${window.location.origin}/account?canceled=true`,
        },
      });

      if (error) {
        logger.error("Error creating checkout session:", error);
        const errorMessage = error.message || "Failed to start checkout. Please try again.";
        toast.error(errorMessage);
        setLoading(null);
        return;
      }

      if (data?.error) {
        logger.error("Checkout session error:", data.error);
        toast.error(data.error || "Failed to start checkout. Please try again.");
        setLoading(null);
        return;
      }

      // All upgrades now go through Stripe checkout
      // No need to handle direct upgrade response anymore

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      logger.error("Error creating checkout session:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start checkout. Please try again.";
      toast.error(errorMessage);
      setLoading(null);
    }
  };

  const formatPrice = (value: number) => {
    if (value === 0) return "€0";
    return `€${value.toFixed(2)}`;
  };

  const basePlans = [
    {
      name: "Free Plan",
      monthlyPrice: 0,
      yearlyPrice: 0,
      icon: <Zap className="h-5 w-5" />,
      gradient: "from-gray-400 to-gray-600",
      features: [
        "10 meals per week",
        "Up to 6 ingredients",
        "Basic recipes",
        "Save up to 3 meals",
        "GPT-4o-mini (20 meals/day limit)"
      ],
      planKey: 'free' as const,
    },
    {
      name: "Beginner Plan",
      monthlyPrice: 4.99,
      yearlyPrice: 49.9,
      icon: <Star className="h-5 w-5" />,
      gradient: "from-blue-500 to-cyan-500",
      features: [
        "40 meals per week",
        "Unlimited ingredients",
        "Advanced recipes",
        "Save up to 20 meals",
        "GPT-4o-mini"
      ],
      planKey: 'beginner' as const,
    },
    {
      name: "Chef Plan",
      monthlyPrice: 14.99,
      yearlyPrice: 149.9,
      icon: <Crown className="h-5 w-5" />,
      gradient: "from-purple-500 to-pink-500",
      features: [
        "80 meals per week",
        "Unlimited ingredients",
        "Personalized suggestions",
        "Unlimited saved meals",
        "GPT-4o"
      ],
      planKey: 'chef' as const,
    },
    {
      name: "Unlimited Plan",
      monthlyPrice: 29.99,
      yearlyPrice: 299.9,
      icon: <Sparkles className="h-5 w-5" />,
      gradient: "from-emerald-500 to-teal-500",
      features: [
        "500 meals per week",
        "Unlimited ingredients",
        "Unlimited saved meals",
        "Personalized themes",
        "GPT-4o"
      ],
      planKey: 'unlimited' as const,
    }
  ];

  const plans = basePlans.map((plan) => {
    const priceValue = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
    const price = formatPrice(priceValue);
    const period = plan.planKey === 'free' ? '' : isYearly ? '/year' : '/month';
    const popular = plan.planKey === 'beginner'
      ? subscription?.plan === 'free'
      : plan.planKey === 'chef'
        ? subscription?.plan === 'beginner'
        : plan.planKey === 'unlimited'
          ? subscription?.plan === 'chef'
          : false;

    const buttonText = plan.planKey === 'free'
      ? subscription?.plan === 'free'
        ? "Current Plan"
        : "Downgrade"
      : subscription?.plan === plan.planKey
        ? "Current Plan"
        : "Upgrade Now";

    return {
      ...plan,
      price,
      period,
      popular,
      buttonText,
    };
  });

  const isCurrent = (planKey: string) => subscription?.plan === planKey;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold mb-2">
            Choose Your Perfect Plan
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            Unlock unlimited meal generation and advanced features
          </p>
        </DialogHeader>

        <div className="flex flex-col items-center gap-2 mt-4">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${!isYearly ? 'text-primary' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <Switch
              id="billing-interval-toggle"
              checked={isYearly}
              onCheckedChange={(checked) => setBillingInterval(checked ? 'yearly' : 'monthly')}
            />
            <span className={`text-sm font-medium ${isYearly ? 'text-primary' : 'text-muted-foreground'}`}>
              Yearly
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {isYearly ? 'Billed annually • Save more with yearly plans' : 'Switch to yearly billing for extra savings'}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl p-6 border-2 transition-all duration-200 hover:shadow-lg ${
                isCurrent(plan.planKey)
                  ? 'border-green-500 shadow-lg bg-green-50 dark:bg-green-950/20'
                  : plan.popular 
                    ? 'border-primary shadow-lg scale-105' 
                    : 'border-border hover:border-primary/50'
              }`}
            >
              {isCurrent(plan.planKey) && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-500 text-white px-3 py-1">
                    Current Plan
                  </Badge>
                </div>
              )}
              {plan.popular && !isCurrent(plan.planKey) && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <div className="text-center mb-4">
                <div className={`inline-flex p-3 rounded-full bg-gradient-to-r ${plan.gradient} text-white mb-3`}>
                  {plan.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-1">{plan.period}</span>
                </div>
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              {plan.planKey === 'beginner' && 
               !isYearly &&
               !isCurrent(plan.planKey) && 
               !subscription?.free_trial_used && 
               subscription?.plan === 'free' && 
               !subscription?.stripe_subscription_id && (
                <Button 
                  className="w-full mb-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-md"
                  disabled={loading !== null}
                  onClick={() => handleCheckout('beginner', true, 'monthly')}
                >
                  {loading === 'trial' ? 'Processing...' : '🎁 Start Free Trial (15 Days)'}
                </Button>
              )}
              
              {plan.planKey === 'free' && !isCurrent(plan.planKey) ? (
                // Downgrade to free - only allowed after subscription period ends
                <Button 
                  className="w-full variant-outline hover:bg-primary hover:text-primary-foreground"
                  disabled={loading !== null || !canChangeToPlan('free')}
                  onClick={() => {
                    // Check if user has a paid subscription with active period
                    const hasPaidSubscriptionWithActivePeriod = subscription && 
                      subscription.plan !== 'free' && 
                      subscription.plan !== 'admin' &&
                      subscription.stripe_subscription_id &&
                      !isSubscriptionPeriodEnded;
                    
                    if (hasPaidSubscriptionWithActivePeriod) {
                      const periodEndDate = subscription?.current_period_end 
                        ? new Date(subscription.current_period_end).toLocaleDateString('ro-RO', { month: 'short', day: 'numeric', timeZone: 'Europe/Bucharest' })
                        : 'the end of the billing period';
                      toast.info(`You can only downgrade to the free plan after your subscription period ends on ${periodEndDate}. Until then, you can only upgrade to a more expensive plan.`);
                    } else if (isSubscriptionPeriodEnded || !subscription?.stripe_subscription_id) {
                      // Subscription period has ended or no subscription, allow downgrade to free
                      toast.info("Switching to free plan...");
                      // Since free plan doesn't require payment, handle it appropriately
                      if (subscription?.stripe_subscription_id && onOpenSettings) {
                        onOpenChange(false);
                        setTimeout(() => {
                          onOpenSettings();
                        }, 100);
                      }
                    }
                  }}
                >
                  {!canChangeToPlan('free') && subscription && subscription.plan !== 'free' && subscription.stripe_subscription_id
                    ? 'Wait for Period End' 
                    : plan.buttonText}
                </Button>
              ) : plan.planKey !== 'free' && !isCurrent(plan.planKey) ? (
                // Paid plans - check if upgrade/downgrade is allowed
                <Button 
                  className={`w-full ${
                    !canChangeToPlan(plan.planKey)
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : plan.popular 
                        ? 'bg-primary hover:bg-primary/90' 
                        : 'variant-outline hover:bg-primary hover:text-primary-foreground'
                  }`}
                  disabled={isCurrent(plan.planKey) || loading !== null || !canChangeToPlan(plan.planKey)}
                  onClick={() => {
                    if (canChangeToPlan(plan.planKey)) {
                      handleCheckout(plan.planKey, false, billingInterval);
                    } else {
                      // If trying to downgrade while subscription period hasn't ended
                      const hasPaidSubscriptionWithActivePeriod = subscription && 
                        subscription.plan !== 'free' && 
                        subscription.plan !== 'admin' &&
                        subscription.stripe_subscription_id &&
                        !isSubscriptionPeriodEnded;
                      
                      if (hasPaidSubscriptionWithActivePeriod) {
                        const periodEndDate = subscription?.current_period_end 
                          ? new Date(subscription.current_period_end).toLocaleDateString('ro-RO', { month: 'short', day: 'numeric', timeZone: 'Europe/Bucharest' })
                          : 'the end of the billing period';
                        toast.error(`You can only downgrade after your subscription period ends on ${periodEndDate}. Until then, you can only upgrade to a more expensive plan.`);
                      }
                    }
                  }}
                >
                  {loading === plan.planKey 
                    ? 'Processing...' 
                    : !canChangeToPlan(plan.planKey) && subscription && subscription.stripe_subscription_id && !isSubscriptionPeriodEnded
                      ? isUpgrade(subscription.plan, plan.planKey) || plan.planKey === subscription.plan
                        ? plan.buttonText
                        : 'Wait for Period End'
                      : plan.buttonText}
                </Button>
              ) : (
                // Current plan - show disabled button
                <Button 
                  className="w-full bg-muted text-muted-foreground cursor-not-allowed"
                  disabled={true}
                >
                  Current Plan
                </Button>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          {hasActivePaidSubscription ? (
            <>
              <p className="text-amber-600 dark:text-amber-500 font-medium mb-2">
                ℹ️ Active Subscription
              </p>
              <p className="mb-1">
                You can upgrade to a more expensive plan anytime. To downgrade or cancel, please cancel your subscription first (it will remain active until the end of the billing period).
              </p>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-2"
                onClick={() => {
                  if (onOpenSettings) {
                    onOpenChange(false);
                    setTimeout(() => {
                      onOpenSettings();
                    }, 100);
                  }
                }}
              >
                Manage Subscription
              </Button>
            </>
          ) : isSubscriptionCancelled ? (
            <>
              <p className="text-blue-600 dark:text-blue-500 font-medium mb-2">
                📅 Subscription Cancelled
              </p>
              <p className="mb-1">
                Your subscription is scheduled for cancellation. You can upgrade to a more expensive plan anytime. Downgrades will only be available after your current billing period ends on {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('ro-RO', { month: 'short', day: 'numeric', timeZone: 'Europe/Bucharest' }) : 'the end of the billing period'}.
              </p>
            </>
          ) : isSubscriptionPeriodEnded ? (
            <>
              <p className="text-green-600 dark:text-green-500 font-medium mb-2">
                ✅ Subscription Ended
              </p>
              <p className="mb-1">
                Your subscription period has ended. You can now change to any plan, including downgrades.
              </p>
            </>
          ) : (
            <>
              <p>
                {subscription?.free_trial_used || (subscription?.plan !== 'free' || subscription?.stripe_subscription_id)
                  ? "Upgrade to enjoy all premium features!"
                  : "🎁 Free 15-day trial available for Beginner Plan. One-time use per account and payment card."
                }
              </p>
              <p className="mt-1">🔒 Secure payment powered by Stripe • Cancel anytime</p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};