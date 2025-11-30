import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ChevronDown, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserActivity } from "@/hooks/useUserActivity";
import { SubtlePlanPrompt } from "@/components/SubtlePlanPrompt";
import { PricingDialog } from "@/components/PricingDialog";
import { MealCard } from "@/components/MealCard";
import { MealDetailDialog } from "@/components/MealDetailDialog";
import { AddIngredientSection } from "@/components/AddIngredientSection";
import { IngredientSearchInput } from "@/components/IngredientSearchInput";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { Switch } from "@/components/ui/switch";


interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
  calories_per_100g?: number;
  protein_per_100g?: number;
  carbs_per_100g?: number;
  fat_per_100g?: number;
}

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

interface MealGeneratorProps {
  onMealGenerated?: () => void;
}

export const MealGenerator = ({ onMealGenerated }: MealGeneratorProps) => {
  const { user } = useAuth();
  const { planLimits, checkLimit, hasFeature, getCurrentPlanDisplay, subscription } = useSubscription();
  const { activity, incrementMealsGenerated } = useUserActivity();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [newIngredient, setNewIngredient] = useState({ name: "", quantity: "", unit: "grams" });
  const [calories, setCalories] = useState("2000");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [showMacros, setShowMacros] = useState(false);
  const [isEasyMode, setIsEasyMode] = useState(false);
  const [servings, setServings] = useState("2");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [generatedMeals, setGeneratedMeals] = useState<GeneratedMeal[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<GeneratedMeal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const units = ["grams", "kg", "ounces", "pieces", "cups", "tbsp", "tsp", "ml", "liters"];

  // Fetch generated meals from database
  const fetchGeneratedMeals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('generated_meals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Convert the database response to match our interface
      const convertedMeals: GeneratedMeal[] = (data || []).map(meal => ({
        ...meal,
        ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : []
      }));
      
      setGeneratedMeals(convertedMeals);
    } catch (error) {
      logger.error('Error fetching generated meals:', error);
    }
  };

  // Fetch generated meals on component mount
  useEffect(() => {
    fetchGeneratedMeals();
  }, [user]);

  useEffect(() => {
    if (isEasyMode) {
      setShowMacros(false);
    }
  }, [isEasyMode]);

 const handleIngredientSelect = (ingredient: Ingredient) => {
   setNewIngredient({
     name: ingredient.name,
     quantity: "",
     unit: "grams"
   });
 };


  const addIngredient = () => {
    if (!newIngredient.name.trim() || !newIngredient.quantity.trim()) {
      toast.error("Please enter ingredient name and quantity");
      return;
    }

    // Check ingredient limit
    if (!checkLimit('max_ingredients', ingredients.length)) {
      setShowUpgrade(true);
      return;
    }

    setIngredients([...ingredients, { ...newIngredient }]);
    setNewIngredient({ name: "", quantity: "", unit: "grams" });
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const generateMeal = async () => {
    // ==== RATE LIMIT LOGGING ====
    console.log("%c[DEBUG] generateMeal() CALLED", "color: yellow; font-size: 18px");

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    console.log("[DEBUG] User fetched:", user, "Error:", userErr);

    if (!user) {
      console.error("[DEBUG] No user found — cannot log activity.");
    } else {
      const { error: insertErr } = await supabase
        .from("user_activity_log")
        .insert({
          user_id: user.id,
          action: "generate_meal",
        });

      console.log("[DEBUG] Insert result:", insertErr ? insertErr : "Success");

      if (insertErr?.message?.includes("Rate limit")) {
        alert("⚠️ Too many requests. Please wait a few seconds!");
        return; // STOP MEAL GENERATION
      }
      if (insertErr) {
        console.error("[DEBUG] Unexpected insert error:", insertErr);
      }
    }

    // ==== END RATE LIMIT LOGGING ====

    console.log("[DEBUG] Rate limit block SUCCESSFULLY INSTALLED");

    if (!user) {
      toast.error("Please sign in to generate meals");
      return;
    }

    // Check weekly meal limit
    if (!checkLimit('meals_per_week', activity?.weekly_meals_used || 0)) {
      setShowUpgrade(true);
      return;
    }

    // Validate inputs
    if (ingredients.length === 0) {
      toast.error("Please add at least one ingredient");
      return;
    }

    const calorieTarget = parseInt(calories);
    if (!isEasyMode && (!calories || isNaN(calorieTarget) || calorieTarget <= 0)) {
      toast.error("Please enter a valid calorie target");
      return;
    }

    const servingsValue = Math.max(1, Math.min(10, parseInt(servings || "2", 10) || 2));

    setIsGenerating(true);
    
    try {
      // Fetch nutritional data for each ingredient from database
      const ingredientsWithNutrition = await Promise.all(
        ingredients.map(async (ingredient) => {
          try {
            // Convert quantity to grams for database lookup
            let quantityInGrams = parseFloat(ingredient.quantity);
            
            // Convert other units to grams (approximate conversions)
            if (ingredient.unit === 'kg') quantityInGrams *= 1000;
            else if (ingredient.unit === 'ounces') quantityInGrams *= 28.35;
            else if (ingredient.unit === 'cups') quantityInGrams *= 240; // approximate for most ingredients
            else if (ingredient.unit === 'tbsp') quantityInGrams *= 15;
            else if (ingredient.unit === 'tsp') quantityInGrams *= 5;
            else if (ingredient.unit === 'ml') quantityInGrams *= 1; // assuming 1ml = 1g for liquids
            else if (ingredient.unit === 'liters') quantityInGrams *= 1000;
            
            // Search for ingredient in database using Supabase client
            try {
              // Try exact match first
              let { data: dbIngredients, error: fetchError } = await supabase
                .from('Ingredients' as any)
                .select('name, calories, protein, carbs, fat')
                .ilike('name', ingredient.name)
                .limit(1);
              
              // If no exact match, try partial match
              if (!fetchError && (!dbIngredients || dbIngredients.length === 0)) {
                const { data: partialMatch, error: partialError } = await supabase
                  .from('Ingredients' as any)
                  .select('name, calories, protein, carbs, fat')
                  .ilike('name', `%${ingredient.name}%`)
                  .limit(1);
                
                if (!partialError) {
                  dbIngredients = partialMatch;
                  fetchError = partialError;
                }
              }
              
              if (fetchError) {
                logger.error(`Error fetching ingredient "${ingredient.name}":`, fetchError);
              } else if (dbIngredients && dbIngredients.length > 0) {
                const dbIngredient = dbIngredients[0];
                logger.debug(`Found ingredient "${ingredient.name}" in DB`);
                
                return {
                  name: dbIngredient.name,
                  available_quantity: Math.round(quantityInGrams),
                  unit: "grams",
                  calories_per_100g: Number(dbIngredient.calories) || 0,
                  protein_per_100g: Number(dbIngredient.protein) || 0,
                  carbs_per_100g: Number(dbIngredient.carbs) || 0,
                  fat_per_100g: Number(dbIngredient.fat) || 0
                };
              } else {
                logger.warn(`Ingredient "${ingredient.name}" not found in database - using fallback values`);
              }
            } catch (fetchError) {
              logger.error(`Error fetching ingredient "${ingredient.name}":`, fetchError);
            }

            // Fallback with estimated values if not found in database
            return {
              name: ingredient.name,
              available_quantity: Math.round(quantityInGrams),
              unit: "grams",
              calories_per_100g: 100, // Default estimate
              protein_per_100g: 5,
              carbs_per_100g: 15,
              fat_per_100g: 2
            };
          } catch (err) {
            logger.error('Error processing ingredient:', ingredient.name, err);
            // Return fallback data
            return {
              name: ingredient.name,
              available_quantity: 100,
              unit: "grams",
              calories_per_100g: 100,
              protein_per_100g: 5,
              carbs_per_100g: 15,
              fat_per_100g: 2
            };
          }
        })
      );

      logger.debug('Ingredients with nutrition:', ingredientsWithNutrition);

      const { data, error } = await supabase.functions.invoke('generate-meal', {
        body: {
          ingredients: ingredientsWithNutrition,
          calories: isEasyMode ? undefined : calorieTarget,
          protein: !isEasyMode && protein ? parseInt(protein, 10) : undefined,
          carbs: !isEasyMode && carbs ? parseInt(carbs, 10) : undefined,
          fats: !isEasyMode && fats ? parseInt(fats, 10) : undefined,
          mode: isEasyMode ? "easy" : "nutri",
          servings: servingsValue
        }
      });

      if (error) {
        logger.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to generate meal');
      }

      // Check if the response indicates success
      if (data && data.error) {
        logger.error('Function returned error:', data.error);
        throw new Error(data.error);
      }

      logger.debug('Meal generation response:', data);

      try {
        await incrementMealsGenerated();
      } catch (err) {
        if (String(err instanceof Error ? err.message : err).includes("Rate limit")) {
          alert("⚠️ Too many requests. Please wait a few seconds and try again!");
        } else {
          // Re-throw if it's not a rate limit error
          throw err;
        }
      }
      
      // Wait a moment for the database transaction to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh meals from database
      const { data: mealsData, error: mealsError } = await supabase
        .from('generated_meals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!mealsError) {
        // Convert the database response to match our interface
        const convertedMeals: GeneratedMeal[] = (mealsData || []).map(meal => ({
          ...meal,
          ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : []
        }));
        setGeneratedMeals(convertedMeals);
      }
      
      logger.debug('Meal generated successfully, calling onMealGenerated callback');
      
      toast.success(`Meal generated successfully! Check the Generated tab to view it.`);
      
      // Switch to generated meals view (especially useful on mobile)
      onMealGenerated?.();
    } catch (error) {
      logger.error('Error generating meal:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to generate meal: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const openMealDetail = (meal: GeneratedMeal) => {
    setSelectedMeal(meal);
    setDialogOpen(true);  
  };

  const weeklyLimit = planLimits?.meals_per_week === null ? "∞" : planLimits?.meals_per_week || 10;
  const weeklyUsage = `${activity?.weekly_meals_used || 0}/${weeklyLimit}`;
  const isWeeklyLimitReached = planLimits && planLimits.meals_per_week !== null && (activity?.weekly_meals_used || 0) >= planLimits.meals_per_week;
  
  const ingredientLimit = planLimits?.max_ingredients || 6;
  const isIngredientLimitReached = planLimits && ingredients.length >= ingredientLimit && planLimits.max_ingredients !== null;
  const isNearIngredientLimit = planLimits && planLimits.max_ingredients !== null && ingredients.length >= (planLimits.max_ingredients - 1);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Plan Status Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {getCurrentPlanDisplay().name}
              </CardTitle>
              <CardDescription>
                Weekly meals: {weeklyUsage} used
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className="text-primary border-primary/20">
                {getCurrentPlanDisplay().price}
              </Badge>
              {/* Cancellation Notice */}
              {subscription?.cancellation_requested_at && subscription?.plan !== 'free' && subscription?.plan !== 'admin' && (
                <div className="p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md max-w-[180px]">
                  <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                    ⚠️ Cancelled
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    {subscription?.current_period_end 
                      ? `Ends ${new Date(subscription.current_period_end).toLocaleDateString('ro-RO', { 
                          month: 'short', 
                          day: 'numeric',
                          timeZone: 'Europe/Bucharest'
                        })}`
                      : 'Ends at period end'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Subtle Limit Warnings */}
      {isWeeklyLimitReached && planLimits && planLimits.meals_per_week !== null && (
        <SubtlePlanPrompt
          message={`Weekly limit reached (${activity?.weekly_meals_used || 0}/${planLimits.meals_per_week})`}
          onUpgrade={() => setShowUpgrade(true)}
          type="limit"
        />
      )}

      {!hasFeature('advanced_recipes') && (
        <SubtlePlanPrompt
          message="Advanced recipes available with Beginner Plan"
          onUpgrade={() => setShowUpgrade(true)}
          type="feature"
        />
      )}

      {isNearIngredientLimit && !isIngredientLimitReached && (
        <SubtlePlanPrompt
          message={`Ingredient limit: ${ingredients.length}/${ingredientLimit} used`}
          onUpgrade={() => setShowUpgrade(true)}
          type="limit"
        />
      )}

      {isIngredientLimitReached && (
        <SubtlePlanPrompt
          message={`Ingredient limit reached (${ingredients.length}/${ingredientLimit})`}
          onUpgrade={() => setShowUpgrade(true)}
          type="limit"
        />
      )}

      <div className="text-center">
        <h2 className="text-2xl font-semibold flex items-center justify-center gap-2 mb-6">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Meal Generator
        </h2>
      </div>

      <div className="space-y-6">
        {/* Add New Ingredient Section */}
        <AddIngredientSection />

        {/* Meal Generation Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
            <Label className="text-base font-medium">Create Your Perfect Meal</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Easy Mode
                </span>
                <Switch 
                  checked={isEasyMode} 
                  onCheckedChange={setIsEasyMode}
                  aria-label="Toggle Easy Mode"
                />
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-6">
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 font-medium">
                <Sparkles className="w-4 h-4" />
                <span>Build your perfect meal with AI!</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Search for ingredients, add them with quantities, set your targets, and let AI generate a delicious, balanced meal for you.
              </p>
              
              {/* Ingredient Search Input */}
              <div className="space-y-4">
                <IngredientSearchInput 
                  onSelect={handleIngredientSelect}
                  placeholder="Search for ingredients from database..."
                />
              </div>
              
              {/* Ingredient Generation Form */}
              <div className="space-y-4">
                {/* Selected Ingredient Display */}
                {newIngredient.name && (
                  <div className="space-y-2">
                    <Label className="text-sm">Selected Ingredient</Label>
                    <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-md p-3">
                      <span className="font-medium text-primary">{newIngredient.name}</span>
                      <Button
                        onClick={() => setNewIngredient({ name: "", quantity: "", unit: "grams" })}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-primary/10"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Quantity and Unit Row */}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3">
                    <Label className="text-sm">Quantity</Label>
                    <Input
                      placeholder="300"
                      value={newIngredient.quantity}
                      onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                    />
                  </div>
                  <div className="col-span-4">
                    <Label className="text-sm">Unit</Label>
                    <Select value={newIngredient.unit} onValueChange={(value) => setNewIngredient({ ...newIngredient, unit: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-5">
                    <Button 
                      onClick={addIngredient} 
                      size="sm" 
                      className={`w-full font-semibold transition-all duration-300 ${
                        isIngredientLimitReached 
                          ? "bg-muted text-muted-foreground cursor-not-allowed" 
                          : !newIngredient.name.trim()
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                      }`}
                      disabled={isIngredientLimitReached || !newIngredient.name.trim()}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {isIngredientLimitReached ? "Limit Reached" : "Add to Recipe"}
                    </Button>
                  </div>
                </div>
                
                {/* Ingredients List */}
                {ingredients.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Added Ingredients:</Label>
                    <div className="space-y-2">
                      {ingredients.map((ingredient, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted/50 rounded-md p-2">
                          <span className="text-sm">
                            {ingredient.quantity} {ingredient.unit} {ingredient.name}
                          </span>
                          <Button
                            onClick={() => removeIngredient(index)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Calorie Target */}
              {!isEasyMode ? (
              <div className="space-y-2">
                <Label className="text-base font-medium">Calorie Target</Label>
                <Input
                  type="number"
                  placeholder="2000"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="w-32"
                />
              </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-base font-medium">Calorie Target</Label>
                  <p className="text-sm text-muted-foreground">
                    Not needed in Easy Mode. Focus on how many people you&apos;re cooking for instead.
                  </p>
                </div>
              )}

              {/* Macronutrient Targets */}
              {!isEasyMode ? (
              <Collapsible open={showMacros} onOpenChange={setShowMacros}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 font-medium">
                    <div className="flex items-center gap-2">
                      Macronutrient Targets (Optional)
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showMacros ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Protein (g)</Label>
                      <Input 
                        type="number"
                        placeholder="0" 
                        value={protein}
                        onChange={(e) => setProtein(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Carbs (g)</Label>
                      <Input 
                        type="number"
                        placeholder="0" 
                        value={carbs}
                        onChange={(e) => setCarbs(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Fats (g)</Label>
                      <Input 
                        type="number"
                        placeholder="0" 
                        value={fats}
                        onChange={(e) => setFats(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Leave blank to focus only on calories. AI will balance macros automatically.
                  </p>
                </CollapsibleContent>
              </Collapsible>
              ) : (
                <div className="space-y-1">
                  <Label className="text-base font-medium">Macronutrient Targets</Label>
                  <p className="text-sm text-muted-foreground">
                    Disabled in Easy Mode. Recipes will prioritize clear instructions and correct portions.
                  </p>
                </div>
              )}

              {/* Servings Selection */}
              {isEasyMode && (
                <div className="space-y-2">
                  <Label className="text-base font-medium">Servings</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground">
                    Tell the AI how many people you&apos;re feeding so it can scale the recipe perfectly.
                  </p>
                </div>
              )}

              {/* Generate Button */}
              <Button
                onClick={generateMeal}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                disabled={isGenerating || isWeeklyLimitReached || !user}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? "Generating..." : 
                 isWeeklyLimitReached ? "Weekly Limit Reached" :
                 !user ? "Sign in to Generate" : "Generate Meal"}
              </Button>
            </div>
          </div>
        </div>
      </div>



      {/* Pricing Dialog */}
      <PricingDialog 
        open={showUpgrade} 
        onOpenChange={setShowUpgrade} 
      />

      {/* Meal Detail Dialog */}
      <MealDetailDialog
        meal={selectedMeal}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};
