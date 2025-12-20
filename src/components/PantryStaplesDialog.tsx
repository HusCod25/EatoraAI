import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronDown, Loader2, ListChecks } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "Sauces Dressings & Condiments", label: "Sauces, Dressings & Condiments", defaultQty: 15 },
  { key: "Spices & Herbs", label: "Spices & Herbs", defaultQty: 2 },
  { key: "Oils", label: "Oils", defaultQty: 10 },
] as const;

interface IngredientOption {
  id: string;
  name: string;
  category: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

interface PantryStaplesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PantryStaplesDialog = ({ open, onOpenChange }: PantryStaplesDialogProps) => {
  const [options, setOptions] = useState<IngredientOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ingredientsData, error } = await supabase
        .from('Ingredients' as any)
        .select('id, name, category, calories, protein, carbs, fat')
        .in('category', CATEGORIES.map((c) => c.key))
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      const { data: staplesData, error: staplesError } = await supabase
        .from('pantry_staples')
        .select('ingredient_id');

      if (staplesError) throw staplesError;

      setOptions((ingredientsData || []) as IngredientOption[]);
      setSelected(new Set((staplesData || []).map((s: any) => s.ingredient_id)));
    } catch (err: any) {
      console.error('Error loading pantry staples:', err);
      toast.error(err?.message || 'Unable to load pantry staples');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void fetchData();
    }
  }, [open]);

  const grouped = useMemo(() => {
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: options.filter((o) => o.category === cat.key),
    }));
  }, [options]);

  const toggleStaple = async (option: IngredientOption) => {
    const isSelected = selected.has(option.id);
    setSaving(option.id);
    try {
      if (isSelected) {
        const { error } = await supabase
          .from('pantry_staples')
          .delete()
          .eq('ingredient_id', option.id);
        if (error) throw error;
        const next = new Set(selected);
        next.delete(option.id);
        setSelected(next);
      } else {
        const categoryDefault = CATEGORIES.find((c) => c.key === option.category)?.defaultQty ?? 10;
        const { error } = await supabase
          .from('pantry_staples')
          .insert({
            ingredient_id: option.id,
            default_quantity_grams: categoryDefault,
          });
        if (error) throw error;
        const next = new Set(selected);
        next.add(option.id);
        setSelected(next);
      }
    } catch (err: any) {
      console.error('Error updating pantry staple:', err);
      toast.error(err?.message || 'Failed to update pantry staple');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Pantry Staples
          </DialogTitle>
          <DialogDescription>
            Select pantry staples you always have on hand. These will be auto-added to recipes and calories/macros will be included.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading pantry staples...
            </div>
          ) : (
            grouped.map((group) => (
              <Collapsible key={group.key} defaultOpen>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <ChevronDown className="h-4 w-4" />
                      <span className="font-semibold">{group.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{group.items.length} items</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {group.items.map((item) => {
                      const checked = selected.has(item.id);
                      return (
                        <label
                          key={item.id}
                          className="flex items-start gap-3 rounded-lg border border-border bg-card/70 p-3 hover:border-primary/40 transition"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleStaple(item)}
                            disabled={saving === item.id}
                            className="mt-0.5"
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.name}</span>
                              {saving === item.id && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              kcal {item.calories ?? '—'} • P {item.protein ?? '—'}g • C {item.carbs ?? '—'}g • F {item.fat ?? '—'}g per 100g
                            </p>
                            <p className="text-[11px] text-muted-foreground">Included automatically when generating meals.</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>

        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          We use small default amounts when calories matter: oils (~10g), sauces (~15g), spices (~2g). You can still add specific quantities manually for precision.
        </div>
      </DialogContent>
    </Dialog>
  );
};
