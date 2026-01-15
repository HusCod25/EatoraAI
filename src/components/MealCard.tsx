import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, ChefHat, Save, Trash2, Timer, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useAuth } from "@/hooks/useAuth";
import { useUserActivity } from "@/hooks/useUserActivity";

interface MealCardProps {
  meal: {
    id: string;
    title: string;
    description?: string;
    ingredients: any[];
    preparation_method: string;
    calories?: number;
    cooking_time?: number;
    tags?: string[];
    protein?: number;
    carbs?: number;
    fats?: number;
    created_at: string;
    expires_at?: string;
    calorie_warning?: string;
    macro_warning?: string;
  };
  type: 'generated' | 'saved';
  onDelete?: () => void;
  onSave?: () => void;
  onClick?: () => void;
  showExpiry?: boolean;
  saveLimit?: number;
  savedCount?: number;
}

export const MealCard = ({ 
  meal, 
  type, 
  onDelete, 
  onSave, 
  onClick, 
  showExpiry = false,
  saveLimit,
  savedCount = 0
}: MealCardProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth();
  const { incrementSavedRecipes } = useUserActivity();

  // Sanitize meal data for display
  const sanitizedMeal = {
    ...meal,
    title: meal.title && typeof meal.title === 'string' && meal.title.trim() 
      ? meal.title.trim() 
      : "Unnamed recipe",
    description: meal.description || "",
    tags: Array.isArray(meal.tags) ? meal.tags.filter(tag => typeof tag === 'string') : []
  };

  const servingsTag = sanitizedMeal.tags?.find(tag => /^serves\s+\d+/i.test(tag));
  const servingsLabel = servingsTag ? servingsTag : "1 serving";

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return "Expired";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast.error("Please sign in to save meals");
      return;
    }

    // Check if limit is reached (null means unlimited, so skip check)
    if (saveLimit !== null && saveLimit !== undefined && savedCount >= saveLimit) {
      toast.error(`You've reached your save limit of ${saveLimit} meals. Upgrade to save more!`);
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

        // Delete the meal from generated_meals after saving (only if it's a generated meal)
        if (type === 'generated' && sanitizedMeal.id) {
          const { error: deleteError } = await supabase
            .from('generated_meals')
            .delete()
            .eq('id', sanitizedMeal.id)
            .eq('user_id', user.id);

          if (deleteError) {
            console.error('Error deleting generated meal after save:', deleteError);
            // Don't throw - meal is already saved, just log the error
          } else {
            console.log('Successfully deleted generated meal:', sanitizedMeal.id);
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
      
      // Call onSave callback to refresh lists
      // Add a small delay to ensure database operations complete
      setTimeout(() => {
      onSave?.();
      }, 100);
    } catch (error) {
      logger.error('Error saving meal:', error);
      toast.error("Failed to save meal. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast.error("Please sign in to delete meals");
      return;
    }

    setIsDeleting(true);
    try {
      const tableName = type === 'generated' ? 'generated_meals' : 'saved_meals';
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', sanitizedMeal.id)
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

  // Count ingredients
  const ingredientCount = Array.isArray(sanitizedMeal.ingredients) ? sanitizedMeal.ingredients.length : 0;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all bg-card/50 backdrop-blur-sm"
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Header with title and buttons */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-semibold text-base leading-tight text-foreground line-clamp-1">
              {sanitizedMeal.title}
            </h3>
            {sanitizedMeal.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                {sanitizedMeal.description}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors h-7 px-2"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            
            {type === 'generated' && (
              <Button
                onClick={handleSave}
                disabled={isSaving || (saveLimit !== null && saveLimit !== undefined && savedCount >= saveLimit)}
                size="sm"
                className="h-7 px-2"
              >
                <Save className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {sanitizedMeal.calories && (
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium">
              <ChefHat className="h-3 w-3" />
              <span>{sanitizedMeal.calories}</span>
            </div>
          )}
          {sanitizedMeal.cooking_time && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
              <Clock className="h-3 w-3" />
              <span>{sanitizedMeal.cooking_time}m</span>
            </div>
          )}
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
            <Users className="h-3 w-3" />
            <span>{servingsLabel}</span>
          </div>
        </div>

        {/* Macros Row */}
        {(sanitizedMeal.protein != null || sanitizedMeal.carbs != null || sanitizedMeal.fats != null) && (
          <div className="flex items-center gap-3 text-xs mb-2">
            {sanitizedMeal.protein != null && (
              <div>
                <span className="font-medium text-blue-600">P:</span>
                <span className="text-foreground ml-1">{sanitizedMeal.protein}g</span>
              </div>
            )}
            {sanitizedMeal.carbs != null && (
              <div>
                <span className="font-medium text-green-600">C:</span>
                <span className="text-foreground ml-1">{sanitizedMeal.carbs}g</span>
              </div>
            )}
            {sanitizedMeal.fats != null && (
              <div>
                <span className="font-medium text-orange-600">F:</span>
                <span className="text-foreground ml-1">{sanitizedMeal.fats}g</span>
              </div>
            )}
          </div>
        )}

        {/* Tags Row */}
        {sanitizedMeal.tags && sanitizedMeal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {sanitizedMeal.tags.slice(0, 2).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
                {tag}
              </Badge>
            ))}
            {sanitizedMeal.tags.length > 2 && (
              <Badge variant="outline" className="text-xs px-2 py-0">
                +{sanitizedMeal.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Bottom Row */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium">Ingredients ({ingredientCount})</div>
          </div>
          
          {showExpiry && sanitizedMeal.expires_at && (
            <div className="flex items-center gap-1 text-xs text-black bg-yellow-600 px-1.5 py-0.5 rounded font-medium">
              <Timer className="h-3 w-3" />
              {getTimeRemaining(sanitizedMeal.expires_at)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};