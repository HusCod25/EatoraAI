import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { AddIngredientModal } from "@/components/AddIngredientModal";

export const AddIngredientSection = () => {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <div className="space-y-4">
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

      <AddIngredientModal 
        open={showAddModal} 
        onOpenChange={setShowAddModal} 
      />
    </>
  );
};

