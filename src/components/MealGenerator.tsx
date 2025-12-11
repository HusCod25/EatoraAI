import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sparkles, ChevronDown, X } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";


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

interface GenerationConfig {
  ingredients: Ingredient[];
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
  isEasyMode: boolean;
  servings: string;
}

interface MealGeneratorProps {
  onMealGenerated?: () => void;
  onMealsUpdated?: () => void;
}

export const MealGenerator = ({ onMealGenerated, onMealsUpdated }: MealGeneratorProps) => {
  const { user } = useAuth();
  const { planLimits, checkLimit, hasFeature, getCurrentPlanDisplay, subscription, loading: subscriptionLoading } = useSubscription();
  const { activity, incrementMealsGenerated, refreshActivity } = useUserActivity();
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
  const [latestGeneratedMeal, setLatestGeneratedMeal] = useState<GeneratedMeal | null>(null);
  const [showFreshMealDialog, setShowFreshMealDialog] = useState(false);
  const [showIngredientsDialog, setShowIngredientsDialog] = useState(false);
  const [lastGenerationConfig, setLastGenerationConfig] = useState<GenerationConfig | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);

  const units = ["grams", "kg", "ounces", "pieces", "cups", "tbsp", "tsp", "ml", "liters"];

  const MEALS_CACHE_TTL = 1000 * 60 * 5; // 5 minutes

  const getMealsCacheKey = () => (user ? `generated_meals_${user.id}` : null);

  const hydrateMealsFromCache = () => {
    if (typeof window === "undefined") return;
    const cacheKey = getMealsCacheKey();
    if (!cacheKey) return;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return;
      const parsed = JSON.parse(cached);
      if (!parsed || typeof parsed !== "object") return;
      if (Date.now() - (parsed.timestamp || 0) > MEALS_CACHE_TTL) return;
      if (Array.isArray(parsed.meals) && parsed.meals.length > 0) {
        setGeneratedMeals(parsed.meals);
      }
    } catch (error) {
      console.warn("Failed to hydrate meals cache", error);
    }
  };

  const persistMealsToCache = (meals: GeneratedMeal[]) => {
    if (typeof window === "undefined") return;
    const cacheKey = getMealsCacheKey();
    if (!cacheKey) return;
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          timestamp: Date.now(),
          meals,
        })
      );
    } catch (error) {
      console.warn("Failed to persist meals cache", error);
    }
  };

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
      persistMealsToCache(convertedMeals);
    } catch (error) {
      logger.error('Error fetching generated meals:', error);
    }
  };

  // Fetch generated meals on component mount
  useEffect(() => {
    hydrateMealsFromCache();
    fetchGeneratedMeals();
  }, [user]);

  useEffect(() => {
    if (isEasyMode) {
      setShowMacros(false);
    }
  }, [isEasyMode]);

  useEffect(() => {
    let progressInterval: number | undefined;

    if (showGenerationDialog && isGenerating) {
      setGenerationProgress((prev) => (prev <= 0 ? 2 : prev));
      progressInterval = window.setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 90) return prev;
          const increment = Math.floor(Math.random() * 4) + 1; // slower creep, whole numbers
          return Math.min(prev + increment, 90);
        });
      }, 1000);
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [showGenerationDialog, isGenerating]);

  useEffect(() => {
    let hideTimeout: number | undefined;
    if (showGenerationDialog && !isGenerating) {
      setGenerationProgress(100);
      hideTimeout = window.setTimeout(() => {
        setShowGenerationDialog(false);
        setGenerationProgress(0);
      }, 600);
    }
    return () => {
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [isGenerating, showGenerationDialog]);

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

  const closeFreshMealDialog = () => {
    setShowFreshMealDialog(false);
    setLatestGeneratedMeal(null);
  };

  const handleKeepLatestMeal = () => {
    closeFreshMealDialog();
  };

  const handleDeleteLatestMeal = async () => {
    if (!latestGeneratedMeal || !user) return;

    try {
      const { error } = await supabase
        .from('generated_meals')
        .delete()
        .eq('id', latestGeneratedMeal.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Meal deleted");
      await fetchGeneratedMeals();
      onMealsUpdated?.();
    } catch (error) {
      logger.error('Error deleting latest meal:', error);
      toast.error("Failed to delete meal");
    } finally {
      closeFreshMealDialog();
    }
  };

  const handleSaveLatestMeal = async () => {
    if (!latestGeneratedMeal || !user) return;

    const saveLimit = planLimits?.max_saved_meals;

    if (typeof saveLimit === "number") {
      const { count, error: countError } = await supabase
        .from('saved_meals')
        .select('*', { head: true, count: 'exact' })
        .eq('user_id', user.id);

      if (countError) {
        logger.error('Error checking save quota:', countError);
        toast.error("Unable to verify save limit. Please try again.");
        return;
      }

      if ((count ?? 0) >= saveLimit) {
        toast.error(`You've reached your save limit of ${saveLimit}.`);
        setShowUpgrade(true);
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('saved_meals')
        .insert({
          user_id: user.id,
          title: latestGeneratedMeal.title,
          description: latestGeneratedMeal.description,
          ingredients: latestGeneratedMeal.ingredients as any,
          preparation_method: latestGeneratedMeal.preparation_method,
          cooking_time: latestGeneratedMeal.cooking_time,
          calories: latestGeneratedMeal.calories,
          tags: latestGeneratedMeal.tags,
          saved_from_generated_id: latestGeneratedMeal.id
        });

      if (error) throw error;

      await supabase
        .from('generated_meals')
        .delete()
        .eq('id', latestGeneratedMeal.id)
        .eq('user_id', user.id);

      toast.success("Meal saved successfully!");
      await fetchGeneratedMeals();
      onMealsUpdated?.();
    } catch (error) {
      logger.error('Error saving latest meal:', error);
      toast.error("Failed to save meal");
      return;
    }

    closeFreshMealDialog();
  };

  const handleRegenerateLatestMeal = async () => {
    if (isGenerating) {
      toast.info("Please wait for the current meal to finish generating.");
      return;
    }

    if (!lastGenerationConfig) {
      toast.error("We couldn't find your original ingredients. Please generate a meal first.");
      return;
    }

    await generateMeal(lastGenerationConfig);
  };

  const handleRegenerateAndDeleteLatestMeal = async () => {
    if (isGenerating) {
      toast.info("Please wait for the current meal to finish generating.");
      return;
    }

    if (!lastGenerationConfig) {
      toast.error("We couldn't find your original ingredients. Please generate a meal first.");
      return;
    }

    // Delete the old meal from the generated tab before generating a new one
    if (latestGeneratedMeal && user) {
      try {
        const { error } = await supabase
          .from('generated_meals')
          .delete()
          .eq('id', latestGeneratedMeal.id)
          .eq('user_id', user.id);

        if (error) {
          logger.error('Error deleting old meal during regeneration:', error);
          toast.error("Failed to delete old meal");
          return;
        } else {
          await fetchGeneratedMeals();
          onMealsUpdated?.();
        }
      } catch (error) {
        logger.error('Error deleting old meal during regeneration:', error);
        toast.error("Failed to delete old meal");
        return;
      }
    }

    await generateMeal(lastGenerationConfig);
  };

  const generateMeal = async (overrideConfig?: GenerationConfig) => {
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

    closeFreshMealDialog();

    const generationConfig = overrideConfig ?? {
      ingredients,
      calories,
      protein,
      carbs,
      fats,
      isEasyMode,
      servings,
    };

    const {
      ingredients: configIngredients,
      calories: configCalories,
      protein: configProtein,
      carbs: configCarbs,
      fats: configFats,
      isEasyMode: configIsEasyMode,
      servings: configServings,
    } = generationConfig;

    // Check weekly meal limit
    if (!checkLimit('meals_per_week', activity?.weekly_meals_used || 0)) {
      setShowUpgrade(true);
      return;
    }

    // Validate inputs
    if (configIngredients.length === 0) {
      toast.error("Please add at least one ingredient");
      return;
    }

    const calorieTarget = parseInt(configCalories);
    if (!configIsEasyMode && (!configCalories || isNaN(calorieTarget) || calorieTarget <= 0)) {
      toast.error("Please enter a valid calorie target");
      return;
    }

    const servingsValue = Math.max(1, Math.min(10, parseInt(configServings || "2", 10) || 2));

    const configSnapshot: GenerationConfig = {
      ingredients: configIngredients.map((ingredient) => ({ ...ingredient })),
      calories: configCalories,
      protein: configProtein,
      carbs: configCarbs,
      fats: configFats,
      isEasyMode: configIsEasyMode,
      servings: configServings,
    };
    setLastGenerationConfig(configSnapshot);

    setShowGenerationDialog(true);
    setGenerationProgress(2);
    setIsGenerating(true);
    
    try {
      // Fetch nutritional data for each ingredient from database
      const ingredientsWithNutrition = await Promise.all(
        configIngredients.map(async (ingredient) => {
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
          calories: configIsEasyMode ? undefined : calorieTarget,
          protein: !configIsEasyMode && configProtein ? parseInt(configProtein, 10) : undefined,
          carbs: !configIsEasyMode && configCarbs ? parseInt(configCarbs, 10) : undefined,
          fats: !configIsEasyMode && configFats ? parseInt(configFats, 10) : undefined,
          mode: configIsEasyMode ? "easy" : "nutri",
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
        await refreshActivity();
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
        if (convertedMeals.length > 0) {
          setLatestGeneratedMeal(convertedMeals[0]);
          setShowFreshMealDialog(true);
        }
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

  const progressMessage = (() => {
    if (generationProgress < 20) return "Analyzing your pantry and targets...";
    if (generationProgress < 40) return "Scouting new flavor combos...";
    if (generationProgress < 60) return "Balancing macros for perfection...";
    if (generationProgress < 80) return "Writing step-by-step instructions...";
    return "Adding finishing touches to keep it unique...";
  })();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Subtle Limit Warnings */}
      {!subscriptionLoading && isWeeklyLimitReached && planLimits && planLimits.meals_per_week !== null && (
        <SubtlePlanPrompt
          message={`Weekly limit reached (${activity?.weekly_meals_used || 0}/${planLimits.meals_per_week})`}
          onUpgrade={() => setShowUpgrade(true)}
          type="limit"
        />
      )}

      {!subscriptionLoading && isNearIngredientLimit && !isIngredientLimitReached && (
        <SubtlePlanPrompt
          message={`Ingredient limit: ${ingredients.length}/${ingredientLimit} used`}
          onUpgrade={() => setShowUpgrade(true)}
          type="limit"
        />
      )}

      {!subscriptionLoading && isIngredientLimitReached && (
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
        {/* Meal Generation Section */}
        <div className="space-y-4">
          <AddIngredientSection variant="banner" className="mt-2" />
          <AddIngredientSection variant="mobile" className="mt-2" />

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
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-[0_40px_120px_rgba(5,8,20,0.7)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-0 opacity-70">
                <div className="absolute -top-6 -left-10 h-40 w-40 bg-primary/25 blur-[100px]" />
                <div className="absolute bottom-0 right-0 h-48 w-48 bg-accent/20 blur-[120px]" />
              </div>
              <div className="relative space-y-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Sparkles className="w-4 h-4" />
                  <span>Build your perfect meal with AI!</span>
                </div>
                <p className="text-sm text-muted-foreground">
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
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-secondary/60 p-3 shadow-inner">
                        <span className="font-medium text-primary">{newIngredient.name}</span>
                        <Button
                          onClick={() => setNewIngredient({ name: "", quantity: "", unit: "grams" })}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:bg-white/10"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                
                  {/* Quantity and Unit Row */}
                  <div className="grid grid-cols-12 gap-2 items-end md:gap-3">
                    <div className="col-span-4 md:col-span-3">
                      <Label className="text-sm">Quantity</Label>
                      <Input
                        placeholder="300"
                        value={newIngredient.quantity}
                        onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                        className="h-10 text-sm md:h-11 md:text-base"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-4">
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
                    <div className="col-span-4 md:col-span-5">
                      <Button 
                        onClick={addIngredient} 
                        size="sm" 
                        className={`w-full h-10 text-xs md:text-sm md:h-11 font-semibold transition-all duration-300 ${
                          isIngredientLimitReached 
                          ? "bg-muted text-muted-foreground cursor-not-allowed" 
                          : !newIngredient.name.trim()
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-[#0A0F0A] shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                        }`}
                        disabled={isIngredientLimitReached || !newIngredient.name.trim()}
                      >
                        {isIngredientLimitReached ? "Limit Reached" : "+ Add"}
                      </Button>
                    </div>
                  </div>
                
                  {/* Ingredients List trigger */}
                  <div className="space-y-2">
                    <Label className="text-sm">Added Ingredients</Label>
                    {ingredients.length > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between rounded-lg border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => setShowIngredientsDialog(true)}
                      >
                        <span>See added ingredients</span>
                        <span className="text-xs text-muted-foreground">({ingredients.length})</span>
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No ingredients added yet.
                      </p>
                    )}
                  </div>
                </div>
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
              ) : null}

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
              ) : null}

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
                onClick={() => generateMeal()}
                className="w-full h-12 rounded-xl bg-[#8AFF8A] text-[#0A0F0A] font-semibold shadow-[0_0_10px_rgba(0,0,0,0.15)] transition-all duration-200 hover:bg-[#7DFFA3] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8AFF8A]/60 focus-visible:ring-offset-[#05070d]"
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
        meal={latestGeneratedMeal}
        open={showFreshMealDialog && !!latestGeneratedMeal}
        onOpenChange={(open) => {
          if (!open) {
            closeFreshMealDialog();
          } else {
            setShowFreshMealDialog(true);
          }
        }}
        showActions
        actions={{
          onKeep: handleKeepLatestMeal,
          onDelete: handleDeleteLatestMeal,
          onSave: handleSaveLatestMeal,
          onRegenerate: handleRegenerateLatestMeal,
          onRegenerateAndDelete: handleRegenerateAndDeleteLatestMeal,
        }}
      />

      <MealDetailDialog
        meal={selectedMeal}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <Dialog open={showIngredientsDialog} onOpenChange={setShowIngredientsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Added Ingredients</DialogTitle>
            <DialogDescription>
              Review or remove the items you've queued for this meal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {ingredients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ingredients added yet.</p>
            ) : (
              ingredients.map((ingredient, index) => (
                <div
                  key={`${ingredient.name}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-card/70 px-3 py-2 text-sm"
                >
                  <span>
                    {ingredient.quantity} {ingredient.unit} {ingredient.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      removeIngredient(index);
                      if (ingredients.length === 1) {
                        setShowIngredientsDialog(false);
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showGenerationDialog} onOpenChange={() => {}}>
        <DialogContent
          hideCloseButton
          className="max-w-sm rounded-3xl border border-primary/30 bg-card/95 text-center shadow-[0_30px_120px_rgba(5,9,20,0.65)]"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Cooking up your meal...</DialogTitle>
            <DialogDescription>
              Hang tight while we remix your ingredients into something different.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div
              className="relative overflow-hidden rounded-2xl border border-primary/40 bg-background/80 py-4 text-sm font-semibold uppercase tracking-wide text-primary shadow-inner"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={generationProgress}
            >
              <span className="relative z-10">
                {generationProgress >= 100 ? "Plating..." : `Charging ${Math.round(generationProgress)}%`}
              </span>
              <span
                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-emerald-300 to-green-500 transition-all duration-300"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <Progress value={generationProgress} className="h-3" />
            <p className="text-sm text-muted-foreground">{progressMessage}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};