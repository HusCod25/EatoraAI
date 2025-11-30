import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Search, MoreVertical, Crown, User, Shield, Gift, X, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { PlanBadge } from "@/components/ui/plan-badge";

interface User {
  id: string;
  email: string;
  created_at: string;
  subscription: {
    plan: string;
    source: 'stripe' | 'manual';
    subscription_status: string;
    current_period_end: string | null;
    cancellation_requested_at: string | null;
    granted_by: string | null;
    granted_at: string | null;
  } | null;
}

export const AdminUsers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Grant subscription modal state
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [grantPlan, setGrantPlan] = useState<string>("unlimited");
  const [grantDays, setGrantDays] = useState<number>(30);
  const [isLifetime, setIsLifetime] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchUsers();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .single();

      setIsAdmin(subscription?.plan === 'admin');
    } catch (error) {
      logger.error('Error checking admin status:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Use the admin function to get all users (verifies admin access server-side)
      const { data: usersData, error } = await supabase.rpc('get_all_users_simple');
      
      if (error) {
        // Handle access denied error
        if (error.message.includes('Access denied') || error.message.includes('Admin privileges required')) {
          logger.warn('Access denied to admin users list:', error);
          toast.error('Access denied: Admin privileges required');
          setIsAdmin(false);
          navigate('/');
          return;
        }
        throw error;
      }

      // Transform the data to match the expected format
      const usersWithSubscriptions = usersData.map((userData: any) => ({
        id: userData.user_id,
        email: userData.email || 'No email',
        created_at: userData.created_at,
        subscription: {
          plan: String(userData.plan || 'free'), // Ensure plan is a string
          source: userData.source || 'stripe',
          subscription_status: userData.subscription_status || 'active',
          current_period_end: userData.current_period_end,
          cancellation_requested_at: userData.cancellation_requested_at,
          granted_by: userData.granted_by,
          granted_at: userData.granted_at
        }
      }));

      setUsers(usersWithSubscriptions);
    } catch (error: any) {
      logger.error('Error fetching users:', error);
      const errorMessage = error?.message || error?.error || 'Failed to load users';
      toast.error(errorMessage);
      
      // If access denied, redirect
      if (errorMessage.includes('Access denied') || errorMessage.includes('Admin privileges required')) {
        setIsAdmin(false);
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGrantSubscription = async () => {
    if (!selectedUser) return;

    // Prevent granting subscription to users with Stripe source
    if (selectedUser.subscription?.source === 'stripe') {
      toast.error('Cannot grant subscription to users with active Stripe subscriptions. Please revoke their Stripe subscription first.');
      setShowGrantModal(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('grant_user_subscription', {
        target_user_uuid: selectedUser.id,
        new_plan: grantPlan,
        days: isLifetime ? null : grantDays,
        is_lifetime: isLifetime
      });

      if (error) {
        logger.error('RPC error:', error);
        throw error;
      }

      if (data) {
        toast.success(`Subscription granted to ${selectedUser.email}`);
        setShowGrantModal(false);
        setSelectedUser(null);
        // Refresh users after a short delay to ensure database is updated
        setTimeout(() => {
          fetchUsers();
        }, 500);
      } else {
        logger.error('Grant subscription returned false');
        toast.error('Failed to grant subscription. Check console for details.');
      }
    } catch (error: any) {
      logger.error('Error granting subscription:', error);
      const errorMessage = error?.message || error?.error || 'Unknown error occurred';
      toast.error(`Failed to grant subscription: ${errorMessage}`);
    }
  };

  const handleRevokeSubscription = async (userId: string, userEmail: string) => {
    try {
      const { data, error } = await supabase.rpc('revoke_user_subscription', {
        target_user_uuid: userId
      });

      if (error) throw error;

      if (data) {
        toast.success(`Subscription revoked for ${userEmail}`);
        fetchUsers();
      } else {
        toast.error('Failed to revoke subscription');
      }
    } catch (error) {
      logger.error('Error revoking subscription:', error);
      toast.error('Failed to revoke subscription');
    }
  };

  const handleMakeAdmin = async (userId: string, userEmail: string) => {
    try {
      const { data, error } = await supabase.rpc('grant_admin_role', {
        target_user_uuid: userId
      });

      if (error) throw error;

      if (data) {
        toast.success(`Admin role granted to ${userEmail}`);
        fetchUsers();
      } else {
        toast.error('Failed to grant admin role');
      }
    } catch (error) {
      logger.error('Error granting admin role:', error);
      toast.error('Failed to grant admin role');
    }
  };

  const handleRemoveAdmin = async (userId: string, userEmail: string) => {
    // Prevent admins from removing their own admin role
    if (user && userId === user.id) {
      toast.error('You cannot remove your own admin role');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('remove_admin_role', {
        target_user_uuid: userId
      });

      if (error) throw error;

      if (data) {
        toast.success(`Admin role removed from ${userEmail}`);
        fetchUsers();
      } else {
        toast.error('Failed to remove admin role');
      }
    } catch (error) {
      logger.error('Error removing admin role:', error);
      toast.error('Failed to remove admin role');
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <X className="h-5 w-5 text-red-500" />
            Access Denied
          </CardTitle>
          <CardDescription>
            You need admin privileges to access this panel.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/')} 
            variant="ghost" 
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Button>
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage user subscriptions and admin roles</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchUsers} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
          <CardDescription>
            Manage subscriptions and admin roles for all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading users...</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Current Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((rowUser) => (
                      <TableRow key={rowUser.id}>
                        <TableCell className="font-medium">{rowUser.email}</TableCell>
                        <TableCell>
                          <PlanBadge plan={(rowUser.subscription?.plan as "free" | "beginner" | "chef" | "unlimited" | "admin") || 'free'} />
                        </TableCell>
                        <TableCell>
                          {rowUser.subscription?.cancellation_requested_at ? (
                            <Badge variant="destructive">Cancelled</Badge>
                          ) : rowUser.subscription?.subscription_status === 'active' ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={rowUser.subscription?.source === 'manual' ? 'secondary' : 'outline'}>
                            {rowUser.subscription?.source || 'stripe'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(rowUser.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* Only show Grant Subscription if user doesn't have Stripe source */}
                              {rowUser.subscription?.source !== 'stripe' && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(rowUser);
                                    setShowGrantModal(true);
                                  }}
                                >
                                  <Gift className="h-4 w-4 mr-2" />
                                  Grant Subscription
                                </DropdownMenuItem>
                              )}
                              {rowUser.subscription?.plan === 'admin' ? (
                                // Only show "Remove Admin" option if it's not the current user
                                user?.id !== rowUser.id && (
                                  <DropdownMenuItem
                                    onClick={() => handleRemoveAdmin(rowUser.id, rowUser.email)}
                                    className="text-red-600"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Remove Admin
                                  </DropdownMenuItem>
                                )
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleMakeAdmin(rowUser.id, rowUser.email)}
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Make Admin
                                </DropdownMenuItem>
                              )}
                              {rowUser.subscription?.plan !== 'free' && rowUser.subscription?.plan !== 'admin' && (
                                <DropdownMenuItem
                                  onClick={() => handleRevokeSubscription(rowUser.id, rowUser.email)}
                                  className="text-red-600"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Revoke Subscription
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grant Subscription Modal */}
      <Dialog open={showGrantModal} onOpenChange={setShowGrantModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Grant Subscription
            </DialogTitle>
            <DialogDescription>
              Grant a subscription to {selectedUser?.email}
              {selectedUser?.subscription?.source === 'stripe' && (
                <span className="block mt-2 text-red-600 font-semibold">
                  ⚠️ Warning: This user has an active Stripe subscription. Granting a manual subscription may cause conflicts.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <Select value={grantPlan} onValueChange={setGrantPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner Plan</SelectItem>
                  <SelectItem value="chef">Chef Plan</SelectItem>
                  <SelectItem value="unlimited">Unlimited Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="lifetime"
                  checked={isLifetime}
                  onCheckedChange={setIsLifetime}
                />
                <Label htmlFor="lifetime">Lifetime subscription</Label>
              </div>
            </div>

            {!isLifetime && (
              <div className="space-y-2">
                <Label htmlFor="days">Duration (days)</Label>
                <Input
                  id="days"
                  type="number"
                  value={grantDays}
                  onChange={(e) => setGrantDays(parseInt(e.target.value) || 30)}
                  min="1"
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowGrantModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGrantSubscription}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Grant Subscription
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
