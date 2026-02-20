import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Settings, Star, LogOut, Shield, Package, Users, CheckCircle, XCircle, ListChecks, DollarSign, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { signOutRobustly } from "@/lib/authUtils";
import { logger } from "@/lib/logger";
import { SettingsDialog } from "./SettingsDialog";
import { PricingDialog } from "./PricingDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserActivity } from "@/hooks/useUserActivity";
import { PlanBadge } from "@/components/ui/plan-badge";
import { ThemeChanger } from "./ThemeChanger";
import { MyAddedIngredients } from "./MyAddedIngredients";
import { AddIngredientSection } from "@/components/AddIngredientSection";
import { AddIngredientModal } from "@/components/AddIngredientModal";
import { PantryStaplesDialog } from "./PantryStaplesDialog";
import { BudgetingSetupDialog } from "./BudgetingSetupDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface UserProfile {
  phone_number?: string;
  username?: string;
  country?: string;
  currency?: string;
  budgeting_enabled?: boolean;
  welcome_card_seen_at?: string | null;
}

export const UserAccount = () => {
  const { user, loading } = useAuth();
  const { getCurrentPlanDisplay, planLimits, loading: subscriptionLoading, subscription, refreshSubscription } = useSubscription();
  const { activity, loading: activityLoading } = useUserActivity();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSettings, setShowSettings] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [settingsScrollToCancel, setSettingsScrollToCancel] = useState(false);
  const [totalSavings, setTotalSavings] = useState(0);
  const [showMyIngredients, setShowMyIngredients] = useState(false);
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);
  const [showPantryStaples, setShowPantryStaples] = useState(false);
  const [showBudgetingSetup, setShowBudgetingSetup] = useState(false);
  const [startedSetupFromWelcome, setStartedSetupFromWelcome] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showWelcomeCard, setShowWelcomeCard] = useState(false);
  const hasShownSuccessToast = useRef(false);
  const hasShownCancelToast = useRef(false);

  // Handle Stripe redirect parameters
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true' && !hasShownSuccessToast.current) {
      hasShownSuccessToast.current = true;
      toast.success("Payment successful! Your subscription has been activated.");
      
      // Poll for subscription update (webhook might take a moment)
      let attempts = 0;
      const maxAttempts = 15; // Increased from 10 to 15 (30 seconds total)
      const pollInterval = 2000; // 2 seconds
      const initialPlan = subscription?.plan; // Capture initial plan
      
      console.log('🔄 Starting subscription polling after checkout:', {
        userId: user?.id,
        initialPlan,
        maxAttempts
      });
      
      const pollSubscription = async () => {
        attempts++;
        console.log(`🔄 Polling subscription (attempt ${attempts}/${maxAttempts})...`);
        
        // Refresh subscription data
        await refreshSubscription();
        
        // Check if plan has changed by querying database directly
        // Note: We don't query free_trial_used here to avoid errors if migration hasn't been applied
        const { data: subData, error: subError } = await supabase
          .from("user_subscriptions")
          .select("plan, subscription_status, source, stripe_subscription_id")
          .eq("user_id", user?.id)
          .maybeSingle();
        
        if (subError) {
          console.error('❌ Error polling subscription:', subError);
        }
        
        console.log('📊 Current subscription data:', {
          plan: subData?.plan,
          status: subData?.subscription_status,
          source: subData?.source,
          hasStripeId: !!subData?.stripe_subscription_id,
          initialPlan,
          changed: subData?.plan !== initialPlan
        });
        
        // Check if subscription was cancelled (e.g., free trial rejection)
        if (subData && subData.subscription_status === 'canceled' && subData.plan === 'free') {
          console.error('❌ Subscription was cancelled (likely free trial rejection)', {
            plan: subData.plan,
            status: subData.subscription_status,
            source: subData.source
          });
          toast.error("Your subscription could not be activated. This card has already been used for a free trial, or you've already used your free trial. Please use a different payment method or contact support.");
          return;
        }
        
        // Check if plan has changed to a paid plan
        if (subData && subData.plan !== 'free' && subData.plan !== initialPlan) {
          // Plan updated successfully, stop polling
          console.log('✅ Plan updated successfully:', {
            from: initialPlan,
            to: subData.plan,
            attempts,
            status: subData.subscription_status
          });
          toast.success(`Your ${subData.plan} plan is now active!`);
          return;
        }
        
        // Also check if plan is still free but has a Stripe subscription ID (webhook might be processing)
        if (subData?.stripe_subscription_id && subData.plan === 'free') {
          console.log('⏳ Webhook processing detected (has Stripe ID but plan is free), continuing to poll...');
        }
        
        if (attempts < maxAttempts) {
          setTimeout(pollSubscription, pollInterval);
        } else {
          // After max attempts, check if subscription was cancelled
          if (subData && subData.plan === 'free' && subData.source === 'stripe') {
            console.error('❌ Subscription ended up as free after checkout - likely rejected', {
              currentPlan: subData?.plan,
              status: subData?.subscription_status,
              hasStripeId: !!subData?.stripe_subscription_id
            });
            toast.error("Your subscription could not be activated. This may be due to payment issues or free trial restrictions. Please try again with a different payment method or contact support.");
        } else {
          console.warn('⚠️ Max polling attempts reached, plan may not have updated yet', {
            currentPlan: subData?.plan,
            initialPlan,
            attempts
          });
          toast.warning("Subscription update may take a few moments. Please refresh the page if it doesn't update soon.");
          }
        }
      };
      
      // Start polling after initial delay
      setTimeout(pollSubscription, pollInterval);
      
      // Remove query parameter after a delay
      setTimeout(() => {
        setSearchParams({});
        // Reset flag after cleanup (allow showing again if user does another checkout)
        setTimeout(() => {
          hasShownSuccessToast.current = false;
        }, 1000);
      }, 5000);
    } else if (canceled === 'true' && !hasShownCancelToast.current) {
      hasShownCancelToast.current = true;
      toast.info("Checkout was canceled. You can try again anytime.");
      // Remove query parameter
      setTimeout(() => {
        setSearchParams({});
        setTimeout(() => {
          hasShownCancelToast.current = false;
        }, 1000);
      }, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch user profile when component mounts
  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchTotalSavings();
    }
  }, [user]);
  
  // Local event-based updates for budgeting savings (no full page refresh)
  useEffect(() => {
    if (!user) return;

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ amount: number }>;
      const amount = customEvent.detail?.amount;
      if (typeof amount === 'number' && !isNaN(amount)) {
        setTotalSavings((prev) => prev + amount);
      }
    };

    window.addEventListener('budget:savings-added', handler as EventListener);

    return () => {
      window.removeEventListener('budget:savings-added', handler as EventListener);
    };
  }, [user]);

  const fetchTotalSavings = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .rpc('get_user_total_savings', { p_user_id: user.id });

      if (error) throw error;
      setTotalSavings(Number(data || 0));
    } catch (err) {
      logger.error('Error fetching total savings:', err);
      setTotalSavings(0);
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;

    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("phone_number, username, country, currency, budgeting_enabled, welcome_card_seen_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      setUserProfile(data);
      if (data && !data.welcome_card_seen_at) {
        setShowWelcomeCard(true);
      }
    } catch (error) {
      logger.error('Error fetching profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogout = async () => {
    toast.success("Logging out...");
    await signOutRobustly(supabase);
  };

  const handleOpenAddIngredient = () => {
    setShowMyIngredients(false);
    setShowAddIngredientModal(true);
  };

  const markWelcomeCardSeen = async () => {
    if (!user || userProfile?.welcome_card_seen_at) return;
    try {
      const seenAt = new Date().toISOString();
      const { error } = await supabase
        .from("profiles")
        .update({ welcome_card_seen_at: seenAt })
        .eq("user_id", user.id);

      if (error) {
        logger.error("Error marking welcome card as seen:", error);
        return;
      }

      setUserProfile((prev) => (prev ? { ...prev, welcome_card_seen_at: seenAt } : prev));
    } catch (err) {
      logger.error("Unexpected error marking welcome card as seen:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (subscriptionLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <Skeleton className="mx-auto h-16 w-16 rounded-full" />
          <Skeleton className="mx-auto h-4 w-32" />
          <Skeleton className="mx-auto h-3 w-40" />
          <div className="flex items-center justify-center gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto">
            <span className="text-white font-semibold">U</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Sign in to save meals and access premium features
          </p>
          <div className="space-y-2">
            <Link to="/signin">
              <Button className="w-full">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button variant="outline" className="w-full">Create Account</Button>
            </Link>
          </div>
        </div>
        <AddIngredientSection variant="banner" className="mt-3" />
      </div>
    );
  }

  const getUserInitials = () => {
    if (userProfile?.username) {
      return userProfile.username.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = () => {
    const displayName = userProfile?.username ? userProfile.username : user?.email || "User";
    return displayName;
  };

  return (
    <div className="space-y-6">
      {/* User Profile */}
      <div className="text-center space-y-3">
        <div className="relative inline-block">
          <div className="w-16 h-16 bg-gradient-fresh rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-lg">{getUserInitials()}</span>
          </div>
        </div>
        {/* Plan Badge */}
        <div className="mt-1">
          <PlanBadge 
            plan={subscription?.plan || "free"}
            className="text-xs font-semibold"
          />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">{getUserDisplayName()}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 px-3 text-xs"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-3 w-3 mr-1" />
            Settings
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 px-3 text-xs"
            onClick={() => setShowMyIngredients(true)}
          >
            <Package className="h-3 w-3 mr-1" />
            My Ingredients
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 px-3 text-xs"
            onClick={() => setShowPantryStaples(true)}
          >
            <ListChecks className="h-3 w-3 mr-1" />
            Pantry Staples
          </Button>
          
          {subscription?.plan === 'admin' && (
            <>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 px-3 text-xs"
                onClick={() => navigate('/admin')}
              >
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 px-3 text-xs"
                onClick={() => navigate('/admin/users')}
              >
                <Users className="h-3 w-3 mr-1" />
                Users
              </Button>
            </>
          )}
          <ThemeChanger />
        </div>
      </div>

      {/* First-time Welcome Card */}
      {showWelcomeCard && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Welcome to Eatora!</p>
              <p className="text-xs text-muted-foreground">
                To get the full experience, set up your budgeting settings and pantry staples. This helps Eatora tailor meals to your real-life habits and costs.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                setShowWelcomeCard(false);
                await markWelcomeCardSeen();
              }}
            >
              Maybe later
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                setShowWelcomeCard(false);
                await markWelcomeCardSeen();
                setStartedSetupFromWelcome(true);
                setShowBudgetingSetup(true);
              }}
            >
              Start setup
            </Button>
          </div>
        </div>
      )}

      {/* Budgeting Setup Section */}
      <div className="py-4 border-t border-b space-y-3">
        <Button 
          variant="outline" 
          className="w-full justify-start h-auto py-3"
          onClick={() => {
            if (userProfile?.country) {
              toast.error("Budgeting settings are locked. Please contact support at support@snacksy.app to make changes.");
            } else {
              setShowBudgetingSetup(true);
            }
          }}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          <div className="flex flex-col items-start">
            <span className="font-medium">Budgeting Setup</span>
            <span className="text-xs text-muted-foreground">Track money saved by cooking at home</span>
          </div>
        </Button>

        {/* Money Saved Display */}
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Money Saved</p>
              <p className="text-2xl font-bold text-primary">
                {userProfile?.currency === 'USD' && '$'}
                {userProfile?.currency === 'EUR' && '€'}
                {userProfile?.currency === 'GBP' && '£'}
                {userProfile?.currency === 'JPY' && '¥'}
                {userProfile?.currency === 'CNY' && '¥'}
                {userProfile?.currency === 'AUD' && 'A$'}
                {userProfile?.currency === 'CAD' && 'C$'}
                {userProfile?.currency === 'CHF' && 'CHF '}
                {userProfile?.currency === 'INR' && '₹'}
                {userProfile?.currency === 'MXN' && 'MX$'}
                {userProfile?.currency === 'BRL' && 'R$'}
                {userProfile?.currency === 'KRW' && '₩'}
                {userProfile?.currency === 'RUB' && '₽'}
                {userProfile?.currency === 'SEK' && 'kr '}
                {userProfile?.currency === 'NZD' && 'NZ$'}
                {userProfile?.currency === 'SGD' && 'S$'}
                {userProfile?.currency === 'HKD' && 'HK$'}
                {userProfile?.currency === 'NOK' && 'kr '}
                {userProfile?.currency === 'TRY' && '₺'}
                {userProfile?.currency === 'ZAR' && 'R'}
                {userProfile?.currency === 'RON' && 'lei '}
                {userProfile?.currency === 'HUF' && 'Ft '}
                {!userProfile?.currency && '$'}
                {totalSavings.toFixed(2)}
              </p>
            </div>
            <div className="bg-primary/10 rounded-full p-3">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </div>
          {!userProfile?.budgeting_enabled || !userProfile?.currency ? (
            <p className="text-xs text-muted-foreground mt-2">
              Setup Budgeting to start saving money
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">
              By cooking at home instead of eating out
            </p>
          )}
        </div>
      </div>

      {/* Activity Stats */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Your Activity & Limits</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-primary mb-1">{activity?.meals_generated || 0}</div>
            <div className="text-xs text-muted-foreground">Meals Generated</div>
          </div>
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-muted-foreground mb-1">{activity?.saved_recipes || 0}</div>
            <div className="text-xs text-muted-foreground">Saved Recipes</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Weekly meals</span>
            <span>
              {activity?.weekly_meals_used || 0}/{planLimits ? (planLimits.meals_per_week === null ? '∞' : planLimits.meals_per_week) : '10'} used
            </span>
          </div>
          <Progress value={planLimits && planLimits.meals_per_week !== null ? Math.min(((activity?.weekly_meals_used || 0) / planLimits.meals_per_week) * 100, 100) : 0} className="h-2" />
        </div>

        {planLimits && (
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Max ingredients:</span>
              <span>{planLimits.max_ingredients || '∞'}</span>
            </div>
            <div className="flex justify-between">
              <span>Max saved meals:</span>
              <span>{planLimits.max_saved_meals || '∞'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Premium Subscription Upgrade or Plan Management */}
      <div className="relative mt-8">
        {subscription?.plan === 'free' ? (
          <div className="bg-gradient-hero rounded-xl p-5 pt-6 border-2 border-primary-glow/30 shadow-glow relative overflow-hidden">
            {/* Subtle shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shine_3s_ease-in-out_infinite] pointer-events-none"></div>
            
            <div className="space-y-4 pt-1">
              {/* Title */}
              <div className="text-center">
                <h3 className="text-lg font-bold text-white mb-2 mt-2">
                  🚀 Unlock Your Full Potential with <span className="text-emerald-300">Premium</span>
                </h3>
              </div>

              {/* Benefits */}
              <div className="space-y-2 text-white/95 text-sm">
                <p>✅ 👨‍🍳 <span className="font-semibold">Unlimited Ingredients & Advanced Recipes</span> – more freedom and creativity</p>
                <p>✅ 📅 <span className="font-semibold">Smarter Meal Planning</span> – up to 400 meals per week, stress-free planning</p>
                <p>✅ ⚡ <span className="font-semibold">Priority Support & Requests</span> – skip the queue & influence future features</p>
              </div>

              {/* Call to Action */}
              <Button 
                onClick={() => setShowPricing(true)}
                className="w-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500 text-white font-semibold py-3 text-base shadow-[0_30px_90px_rgba(34,197,94,0.35)] ring-1 ring-emerald-200/50 transition-all duration-300 hover:-translate-y-0.5 hover:from-emerald-500 hover:to-green-600"
              >
                <Star className="h-5 w-5 mr-2" />
                Upgrade to Premium
              </Button>
              
              <p className="text-center text-white/80 text-xs">
                ✨ Join thousands of users already enjoying premium features
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowPricing(true)}
              className="text-sm"
            >
              See All Plans
            </Button>
          </div>
        )}
      </div>

      {/* Sign Out */}
      <button 
        className="text-sm text-red-400 hover:text-red-300 cursor-pointer"
        onClick={handleLogout}
      >
        Sign Out
      </button>

      {/* Settings Dialog */}
      <SettingsDialog 
        open={showSettings} 
        onOpenChange={(open) => {
          setShowSettings(open);
          if (!open) {
            setSettingsScrollToCancel(false);
          }
        }}
        onUpgradeClick={() => {
          setShowSettings(false);
          setShowPricing(true);
        }}
        scrollToCancel={settingsScrollToCancel}
      />

      {/* Pricing Dialog */}
      <PricingDialog 
        open={showPricing} 
        onOpenChange={setShowPricing}
        onOpenSettings={() => {
          setSettingsScrollToCancel(true);
          setShowSettings(true);
        }}
      />

      {/* My Added Ingredients Dialog */}
      <Dialog open={showMyIngredients} onOpenChange={setShowMyIngredients}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              My Added Ingredients
            </DialogTitle>
            <DialogDescription>
              Track the status of your ingredient submissions
            </DialogDescription>
          </DialogHeader>
          <MyAddedIngredients onRequestAddIngredient={handleOpenAddIngredient} />
        </DialogContent>
      </Dialog>

      <PantryStaplesDialog open={showPantryStaples} onOpenChange={setShowPantryStaples} />

      <BudgetingSetupDialog 
        open={showBudgetingSetup} 
        onOpenChange={(open) => {
          setShowBudgetingSetup(open);
          if (!open) {
            // Refresh profile when dialog closes to update currency display
            fetchUserProfile();
          }
        }}
        onCompleted={() => {
          if (startedSetupFromWelcome) {
            setStartedSetupFromWelcome(false);
            setShowPantryStaples(true);
          }
        }}
      />

      <AddIngredientModal 
        open={showAddIngredientModal} 
        onOpenChange={setShowAddIngredientModal} 
      />
    </div>
  );
};