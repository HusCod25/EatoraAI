export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      generated_meals: {
          homemade_price: number | null
          price_currency: string | null
          restaurant_price: number | null
        Row: {
          calorie_warning: string | null
          calories: number | null
          carbs: number | null
          cooking_time: number | null
          created_at: string
          description: string | null
          expires_at: string
          fats: number | null
          id: string
          ingredients: Json
          macro_warning: string | null
          preparation_method: string
          protein: number | null
          tags: string[] | null
          title: string
          user_id: string
          homemade_price?: number | null
          price_currency?: string | null
          restaurant_price?: number | null
        }
        Insert: {
          calorie_warning?: string | null
          calories?: number | null
          carbs?: number | null
          cooking_time?: number | null
          created_at?: string
          description?: string | null
          expires_at?: string
          fats?: number | null
          id?: string
          ingredients: Json
          macro_warning?: string | null
          preparation_method: string
          protein?: number | null
          tags?: string[] | null
          title: string
          homemade_price?: number | null
          price_currency?: string | null
          restaurant_price?: number | null
          user_id: string
        }
        Update: {
          calorie_warning?: string | null
          calories?: number | null
          carbs?: number | null
          cooking_time?: number | null
          created_at?: string
          description?: string | null
          expires_at?: string
          fats?: number | null
          id?: string
          ingredients?: Json
          macro_warning?: string | null
          preparation_method?: string
          protein?: number | null
          tags?: string[] | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      Ingredients: {
        Row: {
          calories: number | null
          carbs: number | null
          category: string | null
          fat: number | null
          id: string
          name: string
          protein: number | null
          unit: string | null
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          category?: string | null
          fat?: number | null
          id?: string
          name?: string
          protein?: number | null
          unit?: string | null
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          category?: string | null
          fat?: number | null
          id?: string
          name?: string
          protein?: number | null
          unit?: string | null
        }
        Relationships: []
      }
      plan_limits: {
        Row: {
          has_advanced_recipes: boolean
          has_personalized_suggestions: boolean
          has_personalized_themes: boolean
          max_ingredients: number | null
          max_saved_meals: number | null
          meals_per_week: number | null
          plan: Database["public"]["Enums"]["subscription_plan"]
        }
        Insert: {
          has_advanced_recipes?: boolean
          has_personalized_suggestions?: boolean
          has_personalized_themes?: boolean
          max_ingredients?: number | null
          max_saved_meals?: number | null
          meals_per_week?: number | null
          plan: Database["public"]["Enums"]["subscription_plan"]
        }
        Update: {
          has_advanced_recipes?: boolean
          has_personalized_suggestions?: boolean
          has_personalized_themes?: boolean
          max_ingredients?: number | null
          max_saved_meals?: number | null
          meals_per_week?: number | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          budgeting_enabled: boolean | null
          country: string | null
          created_at: string
          currency: string | null
          date_of_birth: string | null
          id: string
          marketing_opt_in: boolean | null
          phone_number: string | null
          updated_at: string
          user_id: string
          username: string | null
          username_updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          budgeting_enabled?: boolean | null
          country?: string | null
          created_at?: string
          currency?: string | null
          date_of_birth?: string | null
          id?: string
          marketing_opt_in?: boolean | null
          phone_number?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          username_updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          budgeting_enabled?: boolean | null
          country?: string | null
          created_at?: string
          currency?: string | null
          date_of_birth?: string | null
          id?: string
          marketing_opt_in?: boolean | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          username_updated_at?: string | null
        }
        Relationships: []
      }
      saved_meals: {
        Row: {
          calories: number | null
          carbs: number | null
          cooking_time: number | null
          created_at: string
          description: string | null
          fats: number | null
          id: string
          ingredients: Json
          homemade_price: number | null
          price_currency: string | null
          preparation_method: string
          protein: number | null
          restaurant_price: number | null
          saved_from_generated_id: string | null
          tags: string[] | null
          title: string
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          cooking_time?: number | null
          created_at?: string
          description?: string | null
          fats?: number | null
          id?: string
          ingredients: Json
          homemade_price?: number | null
          price_currency?: string | null
          preparation_method: string
          protein?: number | null
          restaurant_price?: number | null
          saved_from_generated_id?: string | null
          tags?: string[] | null
          title: string
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          cooking_time?: number | null
          created_at?: string
          description?: string | null
          fats?: number | null
          id?: string
          ingredients?: Json
          homemade_price?: number | null
          price_currency?: string | null
          preparation_method?: string
          protein?: number | null
          restaurant_price?: number | null
          saved_from_generated_id?: string | null
          tags?: string[] | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          created_at: string
          id: string
          meals_generated: number
          saved_recipes: number
          updated_at: string
          user_id: string
          weekly_meals_used: number
          weekly_reset_date: string
          subscription_cycle_start_date: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          meals_generated?: number
          saved_recipes?: number
          updated_at?: string
          user_id: string
          weekly_meals_used?: number
          weekly_reset_date?: string
          subscription_cycle_start_date?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          meals_generated?: number
          saved_recipes?: number
          updated_at?: string
          user_id?: string
          weekly_meals_used?: number
          weekly_reset_date?: string
          subscription_cycle_start_date?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_generated_meals: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      subscription_plan: "free" | "beginner" | "chef" | "unlimited"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      subscription_plan: ["free", "beginner", "chef", "unlimited"],
    },
  },
} as const
