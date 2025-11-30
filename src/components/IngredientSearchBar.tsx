import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { AddIngredientModal } from "@/components/AddIngredientModal";

interface IngredientSuggestion {
  name: string;
  protein?: number;
  carbs?: number;
  fat?: number;
  calories?: number;
}

interface IngredientSearchBarProps {
  onSelect: (ingredient: IngredientSuggestion) => void;
  placeholder?: string;
}

export const IngredientSearchBar = ({ onSelect, placeholder = "Search for ingredients..." }: IngredientSearchBarProps) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search ingredients from Supabase
  const searchIngredients = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('Ingredients' as any)
        .select('name, calories, protein, carbs, fat')
        .ilike('name', `%${searchQuery}%`)
        .limit(10);

      if (error) {
        logger.error('Error searching ingredients:', error);
        setSuggestions([]);
        setIsOpen(false);
      } else {
        const ingredients = (data || []) as unknown as IngredientSuggestion[];
        setSuggestions(ingredients);
        setIsOpen(ingredients.length > 0);
      }
    } catch (error) {
      logger.error('Error searching ingredients:', error);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      searchIngredients(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (ingredient: IngredientSuggestion) => {
    onSelect(ingredient);
    setQuery("");
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <>
      <div className="space-y-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Search Ingredients</Label>
          </div>
          
          {/* Encouraging text and prominent Add Ingredient button */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <Sparkles className="w-4 h-4" />
              <span>Help us grow our ingredient database!</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Can't find your ingredient? Add it to help other users create amazing meals!
            </p>
            <Button
              onClick={() => setShowAddModal(true)}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold py-2.5 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Ingredient
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (query.length >= 2 && suggestions.length > 0) {
                  setIsOpen(true);
                }
              }}
              className="pl-10"
            />
          </div>
          
          {isOpen && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto mt-1"
            >
              {isLoading ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  Searching...
                </div>
              ) : suggestions.length > 0 ? (
                suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="px-4 py-3 hover:bg-muted cursor-pointer text-sm border-b border-border last:border-b-0 transition-colors"
                    onClick={() => handleSelect(suggestion)}
                  >
                    <div className="font-medium text-foreground">{suggestion.name}</div>
                     <div className="text-xs text-muted-foreground">
                       C: {suggestion.carbs}g, P: {suggestion.protein}g, 
                       F: {suggestion.fat}g, {suggestion.calories} kcal/100g
                     </div>
                  </div>
                ))
              ) : query.length >= 2 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>No ingredients found for "{query}"</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsOpen(false);
                        setShowAddModal(true);
                      }}
                      className="h-7 px-3 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 border border-primary/20 hover:border-primary/30 transition-all duration-200"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add "{query}"
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

      </div>

      <AddIngredientModal 
        open={showAddModal} 
        onOpenChange={setShowAddModal} 
      />
    </>
  );
};