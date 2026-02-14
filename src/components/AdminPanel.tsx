import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Eye, Clock, User, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface PendingIngredient {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  unit: string;
  category: string;
  status: string;
  submitted_by: string;
  created_at: string;
  review_notes?: string;
}

export const AdminPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingIngredients, setPendingIngredients] = useState<PendingIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIngredient, setSelectedIngredient] = useState<PendingIngredient | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  // Check if user is admin (has chef or unlimited plan)
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchPendingIngredients();
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

  const fetchPendingIngredients = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Use secure RPC that verifies admin access server-side
      const { data, error } = await supabase.rpc('get_all_pending_ingredients');

      if (error) {
        // Handle access denied errors
        if (error.message.includes('permission denied') || error.message.includes('row-level security')) {
          logger.warn('Access denied to pending ingredients:', error);
          setIsAdmin(false);
          toast.error('Access denied: Admin privileges required');
          navigate('/');
          return;
        }
        throw error;
      }
      setPendingIngredients(data || []);
    } catch (error: any) {
      logger.error('Error fetching pending ingredients:', error);
      const errorMessage = error?.message || error?.error || 'Failed to load pending ingredients';
      toast.error(errorMessage);
      
      // If access denied, update admin status
      if (errorMessage.includes('permission denied') || errorMessage.includes('row-level security')) {
        setIsAdmin(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (ingredient: PendingIngredient, action: 'approve' | 'reject') => {
    setSelectedIngredient(ingredient);
    setAction(action);
    setReviewNotes("");
    setShowDialog(true);
  };

  const submitReview = async () => {
    if (!selectedIngredient || !action || !user) return;

    // Require rejection reason for rejections
    if (action === 'reject' && !reviewNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      // Use secure server-side function that verifies admin access
      const { data, error } = await supabase.rpc('admin_review_ingredient', {
        ingredient_id: selectedIngredient.id,
        review_action: action, // 'approve' or 'reject'
        review_notes: reviewNotes.trim() || null
      });

      if (error) {
        // Handle specific error messages from the database function
        if (error.message.includes('Access denied')) {
          toast.error('Access denied: Admin privileges required');
          // Redirect if user lost admin privileges
          navigate('/');
          return;
        }
        throw error;
      }

      if (data) {
        toast.success(`Ingredient ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
        
        // Refresh the list
        await fetchPendingIngredients();
        
        // Close dialog
        setShowDialog(false);
        setSelectedIngredient(null);
        setAction(null);
        setReviewNotes("");
      } else {
        toast.error(`Failed to ${action} ingredient`);
      }

    } catch (error: any) {
      logger.error('Error reviewing ingredient:', error);
      const errorMessage = error?.message || error?.error || `Failed to ${action} ingredient`;
      toast.error(errorMessage);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
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
    <div className="max-w-6xl mx-auto space-y-6">
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
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage pending ingredient submissions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchPendingIngredients} variant="outline">
            Refresh
          </Button>
          <Button 
            onClick={() => navigate('/')} 
            variant="ghost" 
            size="sm"
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading pending ingredients...</p>
        </div>
      ) : pendingIngredients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground">No pending ingredients to review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingIngredients.map((ingredient) => (
            <Card key={ingredient.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{ingredient.name}</h3>
                      <Badge variant="secondary">{ingredient.category}</Badge>
                      <Badge variant="outline">{ingredient.unit}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">
                      <div>Calories: <span className="font-medium text-foreground">{ingredient.calories}</span></div>
                      <div>Protein: <span className="font-medium text-foreground">{ingredient.protein}g</span></div>
                      <div>Carbs: <span className="font-medium text-foreground">{ingredient.carbs}g</span></div>
                      <div>Fats: <span className="font-medium text-foreground">{ingredient.fats}g</span></div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(ingredient.created_at)}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {ingredient.submitted_by.slice(0, 8)}...
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => handleReview(ingredient, 'approve')}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReview(ingredient, 'reject')}
                      size="sm"
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve' : 'Reject'} Ingredient
            </DialogTitle>
            <DialogDescription>
              {action === 'approve' 
                ? 'This will approve the ingredient and add it to the main database.'
                : 'This will reject the ingredient submission.'
              }
            </DialogDescription>
          </DialogHeader>

          {selectedIngredient && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{selectedIngredient.name}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Calories: {selectedIngredient.calories}</div>
                  <div>Protein: {selectedIngredient.protein}g</div>
                  <div>Carbs: {selectedIngredient.carbs}g</div>
                  <div>Fats: {selectedIngredient.fats}g</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">
                  {action === 'reject' ? 'Rejection Reason (Required)' : 'Review Notes (Optional)'}
                </label>
                <Textarea
                  placeholder={
                    action === 'reject' 
                      ? "Please provide a reason for rejection..." 
                      : "Add any notes about your decision..."
                  }
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="mt-1"
                  required={action === 'reject'}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={submitReview}
                  className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                  variant={action === 'reject' ? 'destructive' : 'default'}
                >
                  {action === 'approve' ? 'Approve & Add to Database' : 'Reject'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
