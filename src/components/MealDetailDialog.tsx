import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Trash2, Bookmark, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Utensils } from "lucide-react";

interface Ingredient {
  name: string;
  quantity_g: number;
  state: string;
  note?: string;
}

interface Meal {
  id: string;
  title: string;
  description?: string;
  ingredients: Ingredient[] | any; // Can be JSON from database
  preparation_method: string;
  cooking_time?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  tags?: string[];
}

interface MealActions {
  onKeep?: () => void;
  onDelete?: () => void;
  onSave?: () => void;
  onRegenerate?: () => void;
}

interface MealDetailDialogProps {
  meal: Meal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showActions?: boolean;
  actions?: MealActions;
}

export const MealDetailDialog = ({ meal, open, onOpenChange, showActions = false, actions }: MealDetailDialogProps) => {
  if (!meal) return null;

  // Sanitize meal data for display
  const sanitizedMeal = {
    ...meal,
    title: meal.title && typeof meal.title === 'string' && meal.title.trim() 
      ? meal.title.trim() 
      : "Unnamed recipe",
    description: meal.description || "",
    tags: Array.isArray(meal.tags) ? meal.tags.filter(tag => typeof tag === 'string') : []
  };

  // Parse ingredients - they can be strings (old format) or objects (new format)
  const ingredients = Array.isArray(sanitizedMeal.ingredients) 
    ? sanitizedMeal.ingredients 
    : typeof sanitizedMeal.ingredients === 'string' 
      ? JSON.parse(sanitizedMeal.ingredients) 
      : [];

  // Convert ingredients to consistent format
  const normalizedIngredients = ingredients
    .map((ingredient: any) => {
      if (typeof ingredient === 'string') {
        return ingredient; // Old format - keep as string for now
      } else if (ingredient && typeof ingredient === 'object' && ingredient.name) {
        // New format with amount field
        if (ingredient.amount) {
          return `${ingredient.amount} ${ingredient.name}`;
        }
        // Legacy format with quantity_g
        else if (ingredient.quantity_g) {
          return `${ingredient.quantity_g}g ${ingredient.name} (${ingredient.state || 'raw'})${ingredient.note ? ` - ${ingredient.note}` : ''}`;
        }
        // Just name available
        else {
          return ingredient.name;
        }
      }
      return String(ingredient || '');
    })
    .filter(ing => ing.trim());

  // Filter out assumptions and meta fields from instructions
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[82vh] overflow-y-auto rounded-[2rem] border border-white/10 bg-card shadow-[0_35px_120px_rgba(3,6,20,0.75)]">
        <DialogHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <DialogTitle className="text-2xl font-bold text-foreground">{sanitizedMeal.title}</DialogTitle>
            {showActions && actions && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={actions.onKeep}
                  disabled={!actions.onKeep}
                  className="rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                >
                  <Check className="mr-1 h-4 w-4" />
                  Keep
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={actions.onDelete}
                  disabled={!actions.onDelete}
                  className="rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={actions.onSave}
                  disabled={!actions.onSave}
                  className="rounded-full border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Bookmark className="mr-1 h-4 w-4" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={actions.onRegenerate}
                  disabled={!actions.onRegenerate}
                  className="rounded-full border-accent/50 text-accent hover:bg-accent/10"
                >
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Regenerate
                </Button>
              </div>
            )}
          </div>
          {sanitizedMeal.description && (
            <p className="text-muted-foreground mt-2 leading-relaxed">{sanitizedMeal.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Nutritional Information */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            {sanitizedMeal.calories && (
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{sanitizedMeal.calories}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Calories</div>
              </div>
            )}
            {sanitizedMeal.protein !== undefined && (
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{sanitizedMeal.protein}g</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Protein</div>
              </div>
            )}
            {sanitizedMeal.fats !== undefined && (
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{sanitizedMeal.fats}g</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Fats</div>
              </div>
            )}
            {sanitizedMeal.carbs !== undefined && (
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{sanitizedMeal.carbs}g</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Carbs</div>
              </div>
            )}
          </div>

          {/* Cooking Time & Tags */}
          <div className="flex items-center justify-between">
            {sanitizedMeal.cooking_time && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{sanitizedMeal.cooking_time} minutes</span>
              </div>
            )}
            
            {sanitizedMeal.tags && sanitizedMeal.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sanitizedMeal.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Ingredients */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">Ingredients</h3>
            <div className="grid gap-3">
              {normalizedIngredients.map((ingredient: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center py-3 px-4 bg-card border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">{ingredient}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Instructions */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">Instructions</h3>
            <div className="space-y-3">
              {instructions.map((step, index) => (
                <div key={index} className="flex gap-4 p-3 bg-card border rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">{step.trim()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};