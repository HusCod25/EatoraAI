import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus, CheckCircle, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase, getSupabaseUrl } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import "./AddIngredientModal.css";

interface AddIngredientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface IngredientFormData {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
  unit: "grams" | "ml";
  category: string;
}

const ingredientCategories = [
  "Vegetables",
  "Fruits", 
  "Proteins",
  "Grains",
  "Dairy",
  "Nuts & Seeds",
  "Oils & Fats",
  "Herbs & Spices",
  "Beverages",
  "Other"
];

export const AddIngredientModal = ({ open, onOpenChange }: AddIngredientModalProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<IngredientFormData>({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    unit: "grams",
    category: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus first input when modal opens
  useEffect(() => {
    if (open && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        name: "",
        calories: "",
        protein: "",
        carbs: "",
        fats: "",
        unit: "grams",
        category: ""
      });
      setIsSuccess(false);
    }
  }, [open]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  const handleInputChange = (field: keyof IngredientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return "Ingredient name is required";
    if (!formData.calories.trim()) return "Calories per 100g/100ml is required";
    if (!formData.protein.trim()) return "Protein content is required";
    if (!formData.carbs.trim()) return "Carbohydrates content is required";
    if (!formData.fats.trim()) return "Fats content is required";

    const calories = parseFloat(formData.calories);
    const protein = parseFloat(formData.protein);
    const carbs = parseFloat(formData.carbs);
    const fats = parseFloat(formData.fats);

    if (isNaN(calories) || calories < 0) return "Calories must be a valid positive number";
    if (isNaN(protein) || protein < 0) return "Protein must be a valid positive number";
    if (isNaN(carbs) || carbs < 0) return "Carbohydrates must be a valid positive number";
    if (isNaN(fats) || fats < 0) return "Fats must be a valid positive number";

    // Basic macro validation (should roughly add up to calories)
    const calculatedCalories = (protein * 4) + (carbs * 4) + (fats * 9);
    const difference = Math.abs(calculatedCalories - calories);
    
    if (difference > 50) {
      return `Macro values don't match calories. Expected ~${Math.round(calculatedCalories)} kcal based on macros.`;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!user) {
      toast.error("Please sign in to submit ingredients");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the auth token for the request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${getSupabaseUrl()}/functions/v1/submit-ingredient`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          calories: parseFloat(formData.calories),
          protein: parseFloat(formData.protein),
          carbs: parseFloat(formData.carbs),
          fats: parseFloat(formData.fats),
          unit: formData.unit,
          category: formData.category || "Other",
          submitted_by: user.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to submit ingredient';
        
        if (String(errorMessage).includes("Rate limit")) {
          alert("⚠️ Too many requests. Please wait a few seconds and try again!");
          return;
        }
        
        throw new Error(errorMessage);
      }

      setIsSuccess(true);
      toast.success("Ingredient submitted successfully! Thank you for contributing! 🎉");
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Rate limit")) {
        alert("⚠️ Too many requests. Please wait a few seconds and try again!");
      } else {
        logger.error('Error submitting ingredient:', error);
        toast.error(errorMessage || 'Failed to submit ingredient');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="modal-content sm:max-w-md bg-background/95 backdrop-blur-xl border-0 shadow-2xl max-h-[85vh] overflow-y-auto"
        onPointerDownOutside={handleBackdropClick}
      >
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500 success-icon" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Thank You! 🎉
              </h3>
              <p className="text-sm text-muted-foreground">
                Your ingredient has been submitted for review. 
                We'll add it to our database soon!
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Auto-closing in 2 seconds...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton
        className="modal-content sm:max-w-lg bg-background/95 backdrop-blur-xl border-0 shadow-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={handleBackdropClick}
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Plus className="w-4 h-4 text-primary" />
              </div>
              Add New Ingredient
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 hover:bg-muted/50"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <DialogDescription className="text-center">
            <div className="space-y-2">
              <p className="font-medium text-primary">🌟 Help us grow our community!</p>
              <p className="text-sm">
                Your ingredient contribution will help thousands of users create amazing, personalized meals. 
                Every ingredient you add makes our AI smarter and more helpful!
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-muted/30 border-muted">
            <CardContent className="p-6 space-y-4">
              {/* Ingredient Name */}
              <div className="space-y-2">
                <Label htmlFor="ingredient-name" className="text-sm font-medium">
                  Ingredient Name *
                </Label>
                <Input
                  ref={firstInputRef}
                  id="ingredient-name"
                  placeholder="e.g., Quinoa, Avocado, Greek Yogurt"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="bg-background/50"
                  required
                />
              </div>

              {/* Unit Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Unit *</Label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="unit"
                      value="grams"
                      checked={formData.unit === "grams"}
                      onChange={(e) => handleInputChange("unit", e.target.value)}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">Grams (g)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="unit"
                      value="ml"
                      checked={formData.unit === "ml"}
                      onChange={(e) => handleInputChange("unit", e.target.value)}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">Milliliters (ml)</span>
                  </label>
                </div>
              </div>

              {/* Nutritional Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Nutritional Information per 100{formData.unit} *</Label>
                  <Badge variant="secondary" className="text-xs">
                    Required
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="calories" className="text-xs text-muted-foreground">
                      Calories (kcal)
                    </Label>
                    <Input
                      id="calories"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="e.g., 350"
                      value={formData.calories}
                      onChange={(e) => handleInputChange("calories", e.target.value)}
                      className="bg-background/50"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="protein" className="text-xs text-muted-foreground">
                      Protein (g)
                    </Label>
                    <Input
                      id="protein"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="e.g., 12.5"
                      value={formData.protein}
                      onChange={(e) => handleInputChange("protein", e.target.value)}
                      className="bg-background/50"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="carbs" className="text-xs text-muted-foreground">
                      Carbs (g)
                    </Label>
                    <Input
                      id="carbs"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="e.g., 45.2"
                      value={formData.carbs}
                      onChange={(e) => handleInputChange("carbs", e.target.value)}
                      className="bg-background/50"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fats" className="text-xs text-muted-foreground">
                      Fats (g)
                    </Label>
                    <Input
                      id="fats"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="e.g., 8.1"
                      value={formData.fats}
                      onChange={(e) => handleInputChange("fats", e.target.value)}
                      className="bg-background/50"
                      required
                    />
                  </div>
                </div>

                {/* Macro validation hint */}
                {formData.calories && formData.protein && formData.carbs && formData.fats && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                    <div className="flex items-center gap-1 mb-1">
                      <AlertCircle className="w-3 h-3" />
                      <span className="font-medium">Macro Check:</span>
                    </div>
                    <div>
                      Expected calories: ~{Math.round((parseFloat(formData.protein || "0") * 4) + (parseFloat(formData.carbs || "0") * 4) + (parseFloat(formData.fats || "0") * 9))} kcal
                      {Math.abs(((parseFloat(formData.protein || "0") * 4) + (parseFloat(formData.carbs || "0") * 4) + (parseFloat(formData.fats || "0") * 9)) - parseFloat(formData.calories || "0")) > 50 && (
                        <span className="text-amber-500 ml-1">⚠️ Large difference</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">
                  Category (Optional)
                </Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredientCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={`flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${isSubmitting ? 'loading-shimmer' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Adding to Database...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Database
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
