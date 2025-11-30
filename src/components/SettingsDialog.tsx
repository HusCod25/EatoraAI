import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase, getSupabaseUrl } from "@/integrations/supabase/client";
import { signOutRobustly } from "@/lib/authUtils";
import { logger } from "@/lib/logger";
import { getVersionString } from "@/lib/version";
import { PlanBadge } from "@/components/ui/plan-badge";
import { User, Upload, CreditCard, Bell, Globe, Palette, Crown, Key, Trash2, AlertTriangle, XCircle, RotateCcw, Plus, Download, ExternalLink, Check } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Profile {
  phone_number?: string;
  username?: string;
  avatar_url?: string;
  username_updated_at?: string;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgradeClick: () => void;
  scrollToCancel?: boolean;
}

export const SettingsDialog = ({ open, onOpenChange, onUpgradeClick, scrollToCancel }: SettingsDialogProps) => {
  const { user } = useAuth();
  const { subscription, getCurrentPlanDisplay, refreshSubscription } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile>({});
  
  // Settings state
  const [username, setUsername] = useState("");
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("en");
  const [notifications, setNotifications] = useState(true);
  
  // Delete account state - two step confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showPasswordStep, setShowPasswordStep] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  // Cancel subscription state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelPassword, setCancelPassword] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Payment history state
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingPaymentData, setLoadingPaymentData] = useState(false);

  useEffect(() => {
    if (user && open) {
      fetchProfile();
      // Refresh subscription data when dialog opens to ensure we have the latest period end
      if (subscription) {
        refreshSubscription();
      }
      // Fetch payment history if user has Stripe subscription
      if (subscription?.stripe_subscription_id) {
        fetchPaymentHistory();
      }
    }
  }, [user, open, subscription?.stripe_subscription_id]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("phone_number, username, avatar_url, username_updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProfile(data);
        setUsername(data.username || "");
      }
    } catch (error) {
      logger.error("Error fetching profile:", error);
      toast.error("Failed to load profile data");
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    // Check if username has changed and if it's been less than 14 days since last change
    if (username !== profile.username && profile.username_updated_at) {
      const lastUpdate = new Date(profile.username_updated_at);
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      if (lastUpdate > fourteenDaysAgo) {
        const nextAllowedDate = new Date(lastUpdate);
        nextAllowedDate.setDate(nextAllowedDate.getDate() + 14);
        toast.error(`You can change your username again on ${nextAllowedDate.toLocaleDateString()}`);
        return;
      }
    }
    
    setLoading(true);
    try {
      const updateData: any = {
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };
      
      // Only update username_updated_at if username actually changed
      if (username !== profile.username) {
        updateData.username = username;
        updateData.username_updated_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from("profiles")
        .upsert(updateData);

      if (error) throw error;
      toast.success("Profile updated successfully");
      // Refresh profile data to get updated timestamp
      fetchProfile();
    } catch (error) {
      logger.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    // Apply theme logic here
    const root = document.documentElement;
    root.className = root.className.replace(/theme-\w+/g, '');
    if (newTheme !== 'light') {
      root.classList.add(`theme-${newTheme}`);
    }
    toast.success(`Theme changed to ${newTheme}`);
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error) {
      logger.error("Error sending password reset:", error);
      toast.error("Failed to send password reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    // Step 1: Validate "delete" confirmation (case-insensitive)
    if (!showPasswordStep) {
      if (deleteConfirmText.toLowerCase() !== "delete") {
        toast.error("Please type 'delete' to confirm");
        return;
      }
      // Move to password step
      setShowPasswordStep(true);
      return;
    }

    // Step 2: Validate password and delete
    if (!deletePassword) {
      toast.error("Please enter your password");
      return;
    }
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(`${getSupabaseUrl()}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: deletePassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account');
      }

      toast.success("Account deleted successfully. Logging out...");
      
      // Clean up local state first
      setShowDeleteDialog(false);
      setDeleteConfirmText("");
      setShowPasswordStep(false);
      setDeletePassword("");
      onOpenChange(false);
      
      // Sign out robustly and redirect
      await signOutRobustly(supabase);
      
    } catch (error: any) {
      logger.error("Error deleting account:", error);
      toast.error(error.message || "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDialogClose = () => {
    setShowDeleteDialog(false);
    setDeleteConfirmText("");
    setShowPasswordStep(false);
    setDeletePassword("");
  };

  const handleCancelSubscription = async () => {
    if (!user || !subscription) return;

    const isCancelled = subscription.cancellation_requested_at !== null;
    const action = isCancelled ? 'reactivate' : 'cancel';

    // Password is only required for cancellation, not for reactivation
    if (action === 'cancel' && !cancelPassword) {
      toast.error("Please enter your password");
      return;
    }

    setCancelLoading(true);
    try {
      const requestBody: any = {
          action: action
      };

      // Only include password for cancellation
      if (action === 'cancel' && cancelPassword) {
        requestBody.password = cancelPassword;
        }

      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: requestBody
      });

      if (error) {
        logger.error("Error managing subscription:", error);
        toast.error(error.message || "Failed to manage subscription");
        return;
      }

      if (data?.error) {
        logger.error("Subscription management error:", data.error);
        toast.error(data.error || "Failed to manage subscription");
        return;
      }

      toast.success(data?.message || (action === 'cancel' ? 'Subscription will be cancelled at the end of the billing period' : 'Subscription reactivated successfully'));
      
      // Close dialog and reset state
      setShowCancelDialog(false);
      setCancelPassword("");
      
      // Refresh subscription data
      await refreshSubscription();
      
    } catch (error: any) {
      logger.error("Error managing subscription:", error);
      toast.error(error.message || "Failed to manage subscription");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleCancelDialogClose = () => {
    setShowCancelDialog(false);
    setCancelPassword("");
  };

  const fetchPaymentHistory = async () => {
    if (!user || !subscription?.stripe_subscription_id) return;

    setLoadingPaymentData(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-payment-history');

      if (error) {
        logger.error("Error fetching payment history:", error);
        return;
      }

      if (data?.invoices) {
        setPaymentHistory(data.invoices);
      }
    } catch (error) {
      logger.error("Error fetching payment history:", error);
    } finally {
      setLoadingPaymentData(false);
    }
  };


  // Don't show cancellation status for free plans, even if flag is set
  const isSubscriptionCancelled = subscription?.cancellation_requested_at !== null 
    && subscription?.plan !== 'free';
  const canCancelSubscription = subscription && 
    subscription.plan !== 'free' && 
    subscription.plan !== 'admin' && 
    subscription.stripe_subscription_id !== null;

  const getUserInitials = () => {
    if (profile.username) {
      return profile.username[0]?.toUpperCase() || 'U';
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const currentPlan = getCurrentPlanDisplay();
  const cancelSectionRef = useRef<HTMLDivElement>(null);

  // Scroll to cancel section if requested
  useEffect(() => {
    if (open && scrollToCancel && cancelSectionRef.current) {
      setTimeout(() => {
        cancelSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [open, scrollToCancel]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                User Profile
              </CardTitle>
              <CardDescription>
                Manage your personal information and profile settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-lg">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Photo
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                  />
                  {profile.username_updated_at && username !== profile.username && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Username can only be changed once every 14 days
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleSaveProfile} disabled={loading} size="sm">
                  {loading ? "Saving..." : "Save Profile"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePasswordReset}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Key className="h-4 w-4" />
                  Reset Password
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* App Preferences Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                App Preferences
              </CardTitle>
              <CardDescription>
                Customize your app experience and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={theme} onValueChange={handleThemeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                      {subscription?.plan === 'unlimited' && (
                        <SelectItem value="diamond">💎 Diamond</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">🇺🇸 English</SelectItem>
                      <SelectItem value="ro">🇷🇴 Romanian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <Label htmlFor="notifications">Notifications</Label>
                </div>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Get notified when saved recipes are about to expire
              </p>
            </CardContent>
          </Card>

          {/* Account & Subscription Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Account & Subscription
              </CardTitle>
              <CardDescription>
                Manage your subscription and view payment history
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Current Plan</p>
                  <div className="flex items-center gap-2 mt-1">
                    <PlanBadge plan={subscription?.plan || 'free'} />
                    <span className="text-sm text-muted-foreground">
                      {currentPlan.price}
                    </span>
                    {isSubscriptionCancelled && subscription?.current_period_end && (
                      <Badge variant="destructive" className="text-xs">
                        Cancelling on {new Date(subscription.current_period_end).toLocaleDateString('ro-RO', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Europe/Bucharest' })}
                      </Badge>
                    )}
                    {isSubscriptionCancelled && !subscription?.current_period_end && (
                      <Badge variant="destructive" className="text-xs">
                        Cancelling at period end
                      </Badge>
                    )}
                  </div>
                </div>
                {subscription?.plan !== 'unlimited' && (
                  <Button onClick={onUpgradeClick} className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Upgrade Plan
                  </Button>
                )}
              </div>
              
              {canCancelSubscription && (
                <>
                  <Separator />
                  <div ref={cancelSectionRef} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {isSubscriptionCancelled ? 'Subscription Cancellation' : 'Cancel Subscription'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isSubscriptionCancelled 
                            ? subscription?.current_period_end 
                              ? `Your subscription will end on ${new Date(subscription.current_period_end).toLocaleDateString('ro-RO', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Europe/Bucharest' })}`
                              : 'Your subscription will end at the end of the current billing period'
                            : 'Cancel your subscription at the end of the current billing period'}
                        </p>
                      </div>
                      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant={isSubscriptionCancelled ? "default" : "destructive"} 
                            className="flex items-center gap-2"
                          >
                            {isSubscriptionCancelled ? (
                              <>
                                <RotateCcw className="h-4 w-4" />
                                Revert Cancellation
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4" />
                                Cancel Subscription
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="sm:max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              {isSubscriptionCancelled ? (
                                <>
                                  <RotateCcw className="h-5 w-5 text-primary" />
                                  Reactivate Subscription?
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-5 w-5 text-destructive" />
                                  Cancel Subscription?
                                </>
                              )}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              <div className="space-y-4">
                                {isSubscriptionCancelled ? (
                                  <>
                                    <p>Are you sure you want to reactivate your subscription?</p>
                                    <p className="text-sm">Your subscription will continue as normal and you will be charged at the end of the current billing period.</p>
                                  </>
                                ) : (
                                  <>
                                    <p>This will cancel your subscription at the end of the current billing period.</p>
                                    <p className="text-sm">You will continue to have access to all premium features until {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('ro-RO', { timeZone: 'Europe/Bucharest' }) : 'the end of your billing period'}.</p>
                                    <p className="text-destructive font-medium">This action requires password confirmation.</p>
                                <div>
                                  <Label htmlFor="cancel-password">Enter your password to confirm</Label>
                                  <Input
                                    id="cancel-password"
                                    type="password"
                                    value={cancelPassword}
                                    onChange={(e) => setCancelPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="mt-2"
                                    disabled={cancelLoading}
                                  />
                                </div>
                                  </>
                                )}
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={handleCancelDialogClose} disabled={cancelLoading}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleCancelSubscription}
                              disabled={cancelLoading || (!isSubscriptionCancelled && !cancelPassword)}
                              className={isSubscriptionCancelled ? "" : "bg-destructive hover:bg-destructive/90"}
                            >
                              {cancelLoading 
                                ? "Processing..." 
                                : isSubscriptionCancelled 
                                  ? "Reactivate Subscription" 
                                  : "Cancel Subscription"
                              }
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </>
              )}
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span className="font-medium">Payment History</span>
                  </div>
                  {subscription?.stripe_subscription_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchPaymentHistory}
                      disabled={loadingPaymentData}
                    >
                      Refresh
                    </Button>
                  )}
                </div>
                {loadingPaymentData ? (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg text-center">
                    Loading payment history...
                  </div>
                ) : subscription?.stripe_subscription_id ? (
                  paymentHistory.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {paymentHistory.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {invoice.currency} {invoice.amount.toFixed(2)}
                              </span>
                              <Badge
                                variant={
                                  invoice.status === 'paid'
                                    ? 'default'
                                    : invoice.status === 'open'
                                    ? 'secondary'
                                    : 'destructive'
                                }
                                className="text-xs"
                              >
                                {invoice.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(invoice.date).toLocaleDateString('ro-RO', {
                                year: 'numeric',
                                timeZone: 'Europe/Bucharest',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                            {invoice.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {invoice.description}
                              </p>
                            )}
                          </div>
                          {invoice.hosted_invoice_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(invoice.hosted_invoice_url, '_blank')}
                              className="ml-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      No payment history available.
                    </div>
                  )
                ) : (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    Payment history will be available when Stripe is connected.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Permanent actions that cannot be undone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog 
                open={showDeleteDialog} 
                onOpenChange={(open) => {
                  // Only allow closing if not in password step or if explicitly closing
                  if (!open && showPasswordStep) {
                    // Reset to first step if trying to close during password step
                    setShowPasswordStep(false);
                    setDeletePassword("");
                  }
                  setShowDeleteDialog(open);
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Delete Account?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        <div className="space-y-4">
                        {!showPasswordStep ? (
                          <>
                          <div className="space-y-2">
                            <p>This action will permanently delete your account and all associated data including:</p>
                            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                              <li>All your saved meals and recipes</li>
                              <li>Your subscription and payment history</li>
                              <li>Your profile and preferences</li>
                              <li>All generated content</li>
                            </ul>
                            <p className="text-destructive font-medium">This action cannot be undone.</p>
                          </div>
                          <div>
                              <Label htmlFor="delete-confirm">To confirm deletion, type <strong>"delete"</strong>:</Label>
                            <Input
                                id="delete-confirm"
                              value={deleteConfirmText}
                              onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Type delete"
                                className="mt-2"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && deleteConfirmText.toLowerCase() === 'delete') {
                                    e.preventDefault();
                                    handleDeleteAccount();
                                  }
                                }}
                            />
                          </div>
                          </>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <p className="text-destructive font-medium">Final confirmation required</p>
                            <p>Please enter your password to permanently delete your account:</p>
                          </div>
                          <div>
                            <Label htmlFor="delete-password">Current Password</Label>
                            <Input
                              id="delete-password"
                              type="password"
                              value={deletePassword}
                              onChange={(e) => setDeletePassword(e.target.value)}
                              placeholder="Enter your password"
                              className="mt-2"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && deletePassword) {
                                    e.preventDefault();
                                    handleDeleteAccount();
                                  }
                                }}
                            />
                          </div>
                        </div>
                      )}
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleDeleteDialogClose}>
                      Cancel
                    </AlertDialogCancel>
                    {!showPasswordStep ? (
                      <Button
                        onClick={handleDeleteAccount}
                        disabled={loading || deleteConfirmText.toLowerCase() !== "delete"}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Continue
                      </Button>
                    ) : (
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                        disabled={loading || !deletePassword}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                        {loading ? "Deleting..." : "Delete Account"}
                    </AlertDialogAction>
                    )}
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>

          {/* App Version */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <p>chompsy.ai {getVersionString()}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};