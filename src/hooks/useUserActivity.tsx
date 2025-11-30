import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface UserActivity {
  meals_generated: number;
  saved_recipes: number;
  weekly_meals_used: number;
  weekly_reset_date: string;
  subscription_cycle_start_date?: string;
}

export const useUserActivity = () => {
  const { user } = useAuth();
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserActivity();
    } else {
      setActivity(null);
      setLoading(false);
    }
  }, [user]);

  const fetchUserActivity = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Use the new function that automatically checks and resets weekly counts
      const { data, error } = await supabase
        .rpc('get_user_activity_with_reset', { user_uuid: user.id });

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      // If no activity record exists, create one with zeros
      if (!data || data.length === 0) {
        try {
          const { error: insertError } = await supabase
            .from("user_activity")
            .insert({
              user_id: user.id,
              meals_generated: 0,
              saved_recipes: 0,
              weekly_meals_used: 0,
              weekly_reset_date: new Date().toISOString().split('T')[0]
            });

          if (insertError) throw insertError;
        } catch (err) {
          if (String(err instanceof Error ? err.message : err).includes("Rate limit")) {
            alert("⚠️ Too many requests. Please wait a few seconds and try again!");
          } else {
            throw err;
          }
        }

        setActivity({
          meals_generated: 0,
          saved_recipes: 0,
          weekly_meals_used: 0,
          weekly_reset_date: new Date().toISOString().split('T')[0],
          subscription_cycle_start_date: new Date().toISOString().split('T')[0]
        });
      } else {
        // The RPC function returns an array, so we take the first (and only) result
        const activityData = data[0];
        setActivity(activityData);
      }

    } catch (error) {
      logger.error("Error fetching user activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const incrementMealsGenerated = async () => {
    if (!user || !activity) return;

    try {
      // First check if weekly reset is needed and perform it if necessary
      let resetPerformed = false;
      try {
        const { data, error: resetError } = await supabase
          .rpc('check_and_reset_user_weekly_count', { user_uuid: user.id });

        resetPerformed = data || false;

        if (resetError) {
          if (String(resetError.message || resetError).includes("Rate limit")) {
            alert("⚠️ Too many requests. Please wait a few seconds and try again!");
            return;
          }
          logger.error("Error checking weekly reset:", resetError);
          // Continue with increment even if reset check fails
        }
      } catch (err) {
        if (String(err instanceof Error ? err.message : err).includes("Rate limit")) {
          alert("⚠️ Too many requests. Please wait a few seconds and try again!");
          return;
        }
        // Continue with increment even if reset check fails
      }

      // If reset was performed, refresh activity data first
      if (resetPerformed) {
        await fetchUserActivity();
        return; // fetchUserActivity will update the state, so we can return here
      }

      // Proceed with normal increment
      const newCount = activity.meals_generated + 1;
      try {
        const { error } = await supabase
          .from("user_activity")
          .update({ 
            meals_generated: newCount,
            weekly_meals_used: activity.weekly_meals_used + 1
          })
          .eq("user_id", user.id);

        if (error) throw error;
      } catch (err) {
        if (String(err instanceof Error ? err.message : err).includes("Rate limit")) {
          alert("⚠️ Too many requests. Please wait a few seconds and try again!");
          return;
        }
        throw err;
      }

      setActivity(prev => prev ? {
        ...prev,
        meals_generated: newCount,
        weekly_meals_used: prev.weekly_meals_used + 1
      } : null);
    } catch (error) {
      logger.error("Error incrementing meals generated:", error);
    }
  };

  const incrementSavedRecipes = async () => {
    if (!user || !activity) return;

    try {
      const newCount = activity.saved_recipes + 1;
      try {
        const { error } = await supabase
          .from("user_activity")
          .update({ saved_recipes: newCount })
          .eq("user_id", user.id);

        if (error) throw error;
      } catch (err) {
        if (String(err instanceof Error ? err.message : err).includes("Rate limit")) {
          alert("⚠️ Too many requests. Please wait a few seconds and try again!");
          return;
        }
        throw err;
      }

      setActivity(prev => prev ? {
        ...prev,
        saved_recipes: newCount
      } : null);
    } catch (error) {
      logger.error("Error incrementing saved recipes:", error);
    }
  };

  const decrementSavedRecipes = async () => {
    if (!user || !activity) return;

    try {
      const newCount = Math.max(0, activity.saved_recipes - 1);
      const { error } = await supabase
        .from("user_activity")
        .update({ saved_recipes: newCount })
        .eq("user_id", user.id);

      if (error) throw error;

      setActivity(prev => prev ? {
        ...prev,
        saved_recipes: newCount
      } : null);
    } catch (error) {
      logger.error("Error decrementing saved recipes:", error);
    }
  };

  return {
    activity,
    loading,
    incrementMealsGenerated,
    incrementSavedRecipes,
    decrementSavedRecipes,
    refreshActivity: fetchUserActivity
  };
};