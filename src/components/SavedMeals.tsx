import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Timer, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { MealDetailDialog } from "./MealDetailDialog";
import { MealCard } from "./MealCard";
import { logger } from "@/lib/logger";

interface Ingredient {
  name: string;
  weight: string;
  unit: string;
}

interface GeneratedMeal {
  id: string;
  title: string;
  description?: string;
  ingredients: any; // Database stores as JSON
  preparation_method: string;
  cooking_time?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  tags?: string[];
  created_at: string;
  expires_at: string;
  restaurant_price?: number | null;
  homemade_price?: number | null;
  price_currency?: string | null;
}

interface SavedMeal {
  id: string;
  title: string;
  description?: string;
  ingredients: Ingredient[];
  preparation_method: string;
  cooking_time?: number;
  calories?: number;
  tags?: string[];
  created_at: string;
  restaurant_price?: number | null;
  homemade_price?: number | null;
  price_currency?: string | null;
}

export const SavedMeals = forwardRef<{ refreshMeals: () => void }>((props, ref) => {
  const { user } = useAuth();
  const { planLimits } = useSubscription();
  const [generatedMeals, setGeneratedMeals] = useState<GeneratedMeal[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState<GeneratedMeal | SavedMeal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'generated' | 'saved' | null>(null);
  const [userCurrency, setUserCurrency] = useState<string | null>(null);
  
  // Get save limit from plan limits (null means unlimited, show as Infinity)
  const saveLimit = planLimits?.max_saved_meals ?? null; // null = unlimited

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refreshMeals: () => {
      logger.debug('Manual refresh triggered from parent - SavedMeals component');
      fetchMeals();
    }
  }));

  useEffect(() => {
    if (user) {
      fetchMeals();
      fetchUserCurrency();
      // Set up real-time updates with immediate refresh
      const channel = supabase
        .channel('meals-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'generated_meals' }, (payload) => {
          logger.debug('Real-time INSERT detected:', payload);
          // Add a small delay to ensure database transaction is committed
          setTimeout(() => {
            fetchGeneratedMeals();
          }, 500);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'generated_meals' }, (payload) => {
          logger.debug('Real-time DELETE detected:', payload);
          fetchGeneratedMeals();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'saved_meals' }, (payload) => {
          logger.debug('Real-time saved meal INSERT detected:', payload);
          setTimeout(() => {
            fetchSavedMeals();
          }, 500);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'saved_meals' }, (payload) => {
          logger.debug('Real-time saved meal DELETE detected:', payload);
          fetchSavedMeals();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchUserCurrency = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('currency')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setUserCurrency(data?.currency ?? null);
    } catch (error) {
      logger.error('Error fetching user currency:', error);
    }
  };

  const fetchMeals = async () => {
    logger.debug('fetchMeals called in SavedMeals component');
    setLoading(true);
    await Promise.all([fetchGeneratedMeals(), fetchSavedMeals()]);
    setLoading(false);
  };

  const fetchGeneratedMeals = async () => {
    if (!user) return;

    try {
      logger.debug('Fetching generated meals for user:', user.id);
      
      const { data, error } = await supabase
        .from('generated_meals')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Database error:', error);
        throw error;
      }
      
      logger.debug('Fetched generated meals:', data?.length || 0, 'meals');
      
      setGeneratedMeals((data as unknown as GeneratedMeal[]) || []);
    } catch (error) {
      logger.error('Error fetching generated meals:', error);
      toast.error('Failed to load generated meals');
    }
  };

  const fetchSavedMeals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('saved_meals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedMeals((data as unknown as SavedMeal[]) || []);
    } catch (error) {
      logger.error('Error fetching saved meals:', error);
      toast.error('Failed to load saved meals');
    }
  };

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

  const handleSaveMeal = async (meal: GeneratedMeal) => {
    if (!user) return;

    // Check if limit is reached (null means unlimited)
    if (saveLimit !== null && savedMeals.length >= saveLimit) {
      toast.error(`You've reached your save limit of ${saveLimit} meals. Upgrade to save more!`);
      return;
    }

    try {
      try {
        const { error } = await supabase
          .from('saved_meals')
          .insert({
            user_id: user.id,
            title: meal.title,
            description: meal.description,
            ingredients: meal.ingredients as any, // Type cast for JSON field
            preparation_method: meal.preparation_method,
            cooking_time: meal.cooking_time,
            calories: meal.calories,
            tags: meal.tags,
            saved_from_generated_id: meal.id,
            restaurant_price: meal.restaurant_price ?? null,
            homemade_price: meal.homemade_price ?? null,
            price_currency: meal.price_currency ?? userCurrency
          });

        if (error) throw error;

        // Delete the meal from generated_meals after saving
        if (meal.id) {
          const { error: deleteError } = await supabase
            .from('generated_meals')
            .delete()
            .eq('id', meal.id)
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

      toast.success('Meal saved successfully!');
      fetchSavedMeals();
      fetchGeneratedMeals(); // Refresh generated meals to remove the saved one
    } catch (error) {
      logger.error('Error saving meal:', error);
      toast.error('Failed to save meal');
    }
  };

  const handleDeleteGeneratedMeal = async (mealId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('generated_meals')
        .delete()
        .eq('id', mealId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Meal deleted successfully');
      fetchGeneratedMeals();
    } catch (error) {
      logger.error('Error deleting generated meal:', error);
      toast.error('Failed to delete meal');
    }
  };

  const handleDeleteSavedMeal = async (mealId: string) => {
    try {
      const { error } = await supabase
        .from('saved_meals')
        .delete()
        .eq('id', mealId);

      if (error) throw error;

      toast.success('Meal deleted successfully');
      fetchSavedMeals();
    } catch (error) {
      logger.error('Error deleting meal:', error);
      toast.error('Failed to delete meal');
    }
  };

  const openMealDetail = (meal: GeneratedMeal | SavedMeal, type: 'generated' | 'saved') => {
    setSelectedMeal(meal);
    setSelectedMealType(type);
    setDialogOpen(true);
  };

  const handleCookedMeal = async () => {
    if (!user || !selectedMeal) return;

    const restaurantPrice = typeof selectedMeal.restaurant_price === 'number' ? selectedMeal.restaurant_price : null;
    const homemadePrice = typeof selectedMeal.homemade_price === 'number' ? selectedMeal.homemade_price : null;
    const currency = selectedMeal.price_currency || userCurrency;

    if (restaurantPrice === null || homemadePrice === null || !currency) {
      toast.error('Missing price data for this meal. Generate a new one with pricing enabled.');
      return;
    }

    const savingsAmount = Math.max(restaurantPrice - homemadePrice, 0);

    try {
      const { error } = await supabase
        .from('budget_entries')
        .insert({
          user_id: user.id,
          meal_id: selectedMeal.id,
          meal_title: selectedMeal.title,
          restaurant_price: restaurantPrice,
          homemade_price: homemadePrice,
          savings_amount: savingsAmount,
          currency,
        });

      if (error) throw error;

      toast.success('Added to your savings!');
      // Notify other parts of the app (e.g., UserAccount) to update totals smoothly
      window.dispatchEvent(new CustomEvent('budget:savings-added', { detail: { amount: savingsAmount } }));
    } catch (error) {
      logger.error('Error adding budget entry:', error);
      toast.error('Failed to add savings. Please try again.');
    }
  };

  const filteredGeneratedMeals = generatedMeals.filter(meal =>
    meal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meal.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSavedMeals = savedMeals.filter(meal =>
    meal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meal.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-primary">Your Meals</h2>
          <p className="text-muted-foreground">
            Sign in to save and access your meal history
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-primary">Your Meals</h2>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search meals or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="generated" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generated" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Generated ({generatedMeals.length})
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Saved ({savedMeals.length}{saveLimit !== null ? `/${saveLimit}` : ''})
          </TabsTrigger>
        </TabsList>

        {/* Generated Meals Tab */}
        <TabsContent value="generated" className="space-y-4">
          {filteredGeneratedMeals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No generated meals found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Generate some meals to see them here (they'll be available for 24 hours)
              </p>
            </div>
          ) : (
            <div className="grid gap-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredGeneratedMeals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  type="generated"
                  onClick={() => openMealDetail(meal, 'generated')}
                  onDelete={fetchGeneratedMeals}
                  onSave={() => {
                    fetchSavedMeals();
                    fetchGeneratedMeals();
                  }}
                  showExpiry={true}
                  saveLimit={saveLimit}
                  savedCount={savedMeals.length}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Saved Meals Tab */}
        <TabsContent value="saved" className="space-y-4">
          {filteredSavedMeals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No saved meals found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Save meals from the Generated tab to keep them permanently
              </p>
            </div>
          ) : (
            <div className="grid gap-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredSavedMeals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  type="saved"
                  onClick={() => openMealDetail(meal, 'saved')}
                  onDelete={fetchSavedMeals}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Meal Detail Dialog */}
      <MealDetailDialog
        meal={selectedMeal}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        showCookedAction={!!selectedMeal}
        onCooked={handleCookedMeal}
      />
    </div>
  );
});