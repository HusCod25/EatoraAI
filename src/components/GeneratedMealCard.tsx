import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Clock, Users, ChefHat, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useUserActivity } from "@/hooks/useUserActivity";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface GeneratedMeal {
  id: string;
  title: string;
  ingredients: any[]; // Can be strings or objects
  preparation_method: string;
  calories: number;
  cooking_time: number;
  description: string;
  tags: string[];
  protein?: number;
  carbs?: number;
  fats?: number;
  created_at: string;
  calorie_warning?: string;
  macro_warning?: string;
}

interface GeneratedMealCardProps {
  meal: GeneratedMeal;
  onSave?: () => void;
  onDelete?: () => void;
}

export const GeneratedMealCard = ({ meal, onSave, onDelete }: GeneratedMealCardProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { incrementSavedRecipes } = useUserActivity();
  const { user } = useAuth();

  // Sanitize meal data for display
  const sanitizedMeal = {
    ...meal,
    title: meal.title && typeof meal.title === 'string' && meal.title.trim() 
      ? meal.title.trim() 
      : "Unnamed recipe",
    description: meal.description || "",
    tags: Array.isArray(meal.tags) ? meal.tags.filter(tag => typeof tag === 'string') : []
  };

  const handleSaveMeal = async () => {
    if (!user) {
      toast.error("Please sign in to save meals");
      return;
    }

    setIsSaving(true);
    try {
      try {
        const { error } = await supabase
          .from('saved_meals')
          .insert({
            user_id: user.id,
            title: sanitizedMeal.title,
            ingredients: sanitizedMeal.ingredients,
            preparation_method: sanitizedMeal.preparation_method,
            calories: sanitizedMeal.calories,
            cooking_time: sanitizedMeal.cooking_time,
            description: sanitizedMeal.description,
            tags: sanitizedMeal.tags,
            protein: sanitizedMeal.protein || 0,
            carbs: sanitizedMeal.carbs || 0,
            fats: sanitizedMeal.fats || 0,
            saved_from_generated_id: sanitizedMeal.id
          });

        if (error) throw error;

        // Delete the meal from generated_meals after saving
        if (sanitizedMeal.id) {
          const { error: deleteError } = await supabase
            .from('generated_meals')
            .delete()
            .eq('id', sanitizedMeal.id)
            .eq('user_id', user.id);

          if (deleteError) {
            console.error('Error deleting generated meal after save:', deleteError);
            // Don't throw - meal is already saved, just log the error
          }
        }
      } catch (err) {
        if (String(err instanceof Error ? err.message : err).includes("Rate limit")) {
          alert("⚠️ Too many requests. Please wait a few seconds and try again!");
          return;
        }
        throw err;
      }

      await incrementSavedRecipes();
      toast.success("Meal saved to your collection!");
      onSave?.();
    } catch (error) {
      logger.error('Error saving meal:', error);
      toast.error("Failed to save meal. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMeal = async () => {
    if (!user) {
      toast.error("Please sign in to delete meals");
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('generated_meals')
        .delete()
        .eq('id', meal.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Meal deleted successfully!");
      onDelete?.();
    } catch (error) {
      logger.error('Error deleting meal:', error);
      toast.error("Failed to delete meal. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const instructions = sanitizedMeal.preparation_method
    .split('\n')
    .filter(step => step.trim())
    .filter(step => 
      !step.toLowerCase().includes('assumption') &&
      !step.toLowerCase().includes('note:') &&
      !step.toLowerCase().includes('disclaimer')
    )
    .map(step => {
      // Clean up step formatting - remove extra numbers if they exist
      return step.replace(/^\d+\.\s*/, '').trim();
    });

  // Find where the SERVE section starts
  const serveIndex = instructions.findIndex(step => 
    step.toUpperCase().includes('**SERVE:**') || 
    step.toUpperCase().includes('SERVE:')
  );

  // Split instructions into cooking and serving sections
  const cookingInstructions = serveIndex !== -1 
    ? instructions.slice(0, serveIndex) 
    : instructions;
  
  const servingInstructions = serveIndex !== -1 
    ? instructions.slice(serveIndex + 1).filter(step => step.trim()) // Skip the "SERVE:" header
    : [];
  
  // Normalize ingredients for display with better gramage formatting
  const normalizedIngredients = sanitizedMeal.ingredients.map((ingredient: any) => {
    if (typeof ingredient === 'string') {
      return ingredient; // Old format
    } else if (ingredient && typeof ingredient === 'object') {
      if (ingredient.name && ingredient.amount) {
        // New format with amount (e.g., "150g", "1 tsp (optional)")
        return `${ingredient.amount} ${ingredient.name}`;
      } else if (ingredient.name && ingredient.quantity_used) {
        // Legacy format with quantity_used
        return `${ingredient.quantity_used}g ${ingredient.name}`;
      } else if (ingredient.name && ingredient.quantity_g) {
        // Legacy format with quantity_g
        return `${ingredient.quantity_g}g ${ingredient.name}`;
      } else if (ingredient.name) {
        // Just name available
        return ingredient.name;
      }
    }
    return String(ingredient || '');
  }).filter(ing => ing.trim());

  // Check if there are any warnings
  const hasWarnings = sanitizedMeal.calorie_warning || sanitizedMeal.macro_warning;

  return (
    <>
      <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowDetails(true)}>
        {/* Warning Section */}
        {hasWarnings && (
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-200 dark:border-yellow-800/50 px-4 py-3">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-5 h-5 bg-yellow-400 dark:bg-yellow-500 rounded-full flex items-center justify-center text-yellow-900 dark:text-yellow-100 font-bold text-sm">
                !
              </div>
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                {sanitizedMeal.calorie_warning && (
                  <p className="mb-1">
                    <span className="font-medium">Calorie Target:</span> {sanitizedMeal.calorie_warning}
                  </p>
                )}
                {sanitizedMeal.macro_warning && (
                  <p>
                    <span className="font-medium">Macronutrients:</span> {sanitizedMeal.macro_warning}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        <CardHeader className="bg-gradient-to-r from-primary/5 to-background">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-xl">{sanitizedMeal.title}</CardTitle>
              {sanitizedMeal.description && (
                <CardDescription>{sanitizedMeal.description}</CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteMeal();
                }}
                disabled={isDeleting}
                size="sm"
                variant="ghost"
                className="flex items-center gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveMeal();
                }}
                disabled={isSaving}
                size="sm"
                className="flex items-center gap-2 bg-primary/90 hover:bg-primary"
              >
                <Heart className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-6">
          {/* Quick Stats */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 rounded-full text-sm font-medium">
              <ChefHat className="h-4 w-4" />
              <span>{sanitizedMeal.calories}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
              <Clock className="h-4 w-4" />
              <span>{sanitizedMeal.cooking_time}m</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
              <Users className="h-4 w-4" />
              <span>Serves 1</span>
            </div>
          </div>

          {/* Tags */}
          {sanitizedMeal.tags && sanitizedMeal.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sanitizedMeal.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Ingredients Preview */}
          <div className="pt-2 border-t">
            <h4 className="font-semibold mb-2 text-sm">Ingredients ({normalizedIngredients.length})</h4>
            <div className="text-sm text-muted-foreground">
              {normalizedIngredients.slice(0, 3).join(', ')}{normalizedIngredients.length > 3 && '...'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipe Detail Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{sanitizedMeal.title}</DialogTitle>
            {sanitizedMeal.description && (
              <p className="text-muted-foreground mt-2">{sanitizedMeal.description}</p>
            )}
            
            {/* Warning Section in Dialog */}
            {hasWarnings && (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/50 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-5 h-5 bg-yellow-400 dark:bg-yellow-500 rounded-full flex items-center justify-center text-yellow-900 dark:text-yellow-100 font-bold text-sm">
                    !
                  </div>
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium mb-2">Recipe Limitations:</p>
                    {sanitizedMeal.calorie_warning && (
                      <p className="mb-1">
                        <span className="font-medium">Calorie Target:</span> {sanitizedMeal.calorie_warning}
                      </p>
                    )}
                    {sanitizedMeal.macro_warning && (
                      <p>
                        <span className="font-medium">Macronutrients:</span> {sanitizedMeal.macro_warning}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogHeader>

          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-primary" />
                <span className="font-medium">{sanitizedMeal.calories} calories</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-medium">{sanitizedMeal.cooking_time} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">1 serving</span>
              </div>
            </div>

            {/* Tags */}
            {sanitizedMeal.tags && sanitizedMeal.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sanitizedMeal.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <Separator />

            {/* Ingredients */}
              <div className="space-y-4">
              <h3 className="text-xl font-semibold">Ingredients</h3>
              <div className="grid gap-3">
                {normalizedIngredients && normalizedIngredients.length > 0 ? (
                  normalizedIngredients.map((ingredient, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 py-3 px-4 bg-muted/30 rounded-lg"
                    >
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                      <span className="text-sm font-medium">{ingredient}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-3 px-4 bg-muted/20 rounded-lg text-center text-muted-foreground">
                    No ingredients available
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                All weights shown in grams for precision
              </div>
            </div>

            <Separator />

            {/* Cooking Instructions */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Cooking Instructions</h3>
              <div className="space-y-4">
                {cookingInstructions.map((step, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 py-1">
                      <p className="leading-relaxed">{step}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Serving/Plating Section */}
              {servingInstructions.length > 0 && (
                <>
                  <h3 className="text-xl font-semibold mt-6">Serve</h3>
                  <div className="space-y-4">
                    {servingInstructions.map((step, index) => (
                      <div key={`serve-${index}`} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold">
                          {cookingInstructions.length + index + 1}
                        </div>
                        <div className="flex-1 py-1">
                          <p className="leading-relaxed">{step}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Macronutrients */}
            {(sanitizedMeal.protein || sanitizedMeal.carbs || sanitizedMeal.fats) && (
              <>
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Nutritional Information</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {sanitizedMeal.protein && (
                      <div className="text-center p-4 bg-muted/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{sanitizedMeal.protein}g</div>
                        <div className="text-sm text-muted-foreground">Protein</div>
                      </div>
                    )}
                    {sanitizedMeal.carbs && (
                      <div className="text-center p-4 bg-muted/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{sanitizedMeal.carbs}g</div>
                        <div className="text-sm text-muted-foreground">Carbs</div>
                      </div>
                    )}
                    {sanitizedMeal.fats && (
                      <div className="text-center p-4 bg-muted/20 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{sanitizedMeal.fats}g</div>
                        <div className="text-sm text-muted-foreground">Fats</div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};