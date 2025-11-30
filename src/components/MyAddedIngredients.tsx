import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  X,
  Package,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useAuth } from "@/hooks/useAuth";

interface UserIngredient {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  unit: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  created_at: string;
  reviewed_at?: string;
}

export const MyAddedIngredients = () => {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<UserIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIngredient, setSelectedIngredient] = useState<UserIngredient | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserIngredients();
    }
  }, [user]);

  const fetchUserIngredients = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pending_ingredients')
        .select('*')
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      logger.error('Error fetching user ingredients:', error);
      toast.error('Failed to load your ingredients');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
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

  const handleViewDetails = (ingredient: UserIngredient) => {
    setSelectedIngredient(ingredient);
    setShowDialog(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading your ingredients...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            My Added Ingredients
          </h2>
          <p className="text-muted-foreground">Track the status of your ingredient submissions</p>
        </div>
        <Button onClick={fetchUserIngredients} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {ingredients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No ingredients submitted yet</h3>
            <p className="text-muted-foreground mb-4">
              Start contributing to our ingredient database by adding new ingredients!
            </p>
            <Button onClick={() => window.location.href = '/'} variant="outline">
              Add Your First Ingredient
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ingredients.map((ingredient) => (
            <Card 
              key={ingredient.id} 
              className="hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => handleViewDetails(ingredient)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {getStatusIcon(ingredient.status)}
                      <h3 className="text-lg font-semibold">{ingredient.name}</h3>
                      {getStatusBadge(ingredient.status)}
                      <Badge variant="outline" className="text-xs">
                        {ingredient.unit}
                      </Badge>
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
                        Submitted: {formatDate(ingredient.created_at)}
                      </div>
                      {ingredient.reviewed_at && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Reviewed: {formatDate(ingredient.reviewed_at)}
                        </div>
                      )}
                    </div>

                    {ingredient.review_notes && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm">
                          <span className="font-medium">Admin Note:</span> {ingredient.review_notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-4 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(ingredient);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIngredient && getStatusIcon(selectedIngredient.status)}
              Ingredient Details
            </DialogTitle>
            <DialogDescription>
              Complete information about your submitted ingredient
            </DialogDescription>
          </DialogHeader>

          {selectedIngredient && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-lg">{selectedIngredient.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(selectedIngredient.status)}
                    <Badge variant="outline">{selectedIngredient.unit}</Badge>
                    {selectedIngredient.category && (
                      <Badge variant="secondary">{selectedIngredient.category}</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>Submitted: {formatDate(selectedIngredient.created_at)}</div>
                  {selectedIngredient.reviewed_at && (
                    <div>Reviewed: {formatDate(selectedIngredient.reviewed_at)}</div>
                  )}
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h5 className="font-semibold mb-3">Nutritional Information (per 100{selectedIngredient.unit})</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span>Calories:</span>
                    <span className="font-medium">{selectedIngredient.calories}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Protein:</span>
                    <span className="font-medium">{selectedIngredient.protein}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Carbohydrates:</span>
                    <span className="font-medium">{selectedIngredient.carbs}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fats:</span>
                    <span className="font-medium">{selectedIngredient.fats}g</span>
                  </div>
                </div>
              </div>

              {selectedIngredient.review_notes && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h5 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Admin Review
                  </h5>
                  <p className="text-sm">{selectedIngredient.review_notes}</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setShowDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
