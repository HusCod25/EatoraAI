import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { AddIngredientModal } from "@/components/AddIngredientModal";
import { cn } from "@/lib/utils";

interface AddIngredientSectionProps {
  variant?: "banner" | "mobile";
  className?: string;
}

export const AddIngredientSection = ({
  variant = "banner",
  className,
}: AddIngredientSectionProps) => {
  const [showAddModal, setShowAddModal] = useState(false);

  const handleOpen = () => setShowAddModal(true);

  const DesktopBanner = (
    <div
      className={cn(
        "hidden min-h-[48px] md:flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground/90 backdrop-blur",
        className
      )}
    >
      <div className="flex items-center gap-2 font-medium">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>Missing an ingredient? Add it to our pantry.</span>
      </div>
      <Button
        onClick={handleOpen}
        size="sm"
        className="h-9 rounded-full bg-primary text-[#0A0F0A] px-4 font-semibold shadow-[0_0_15px_rgba(138,255,138,0.35)] hover:bg-primary/90"
      >
        <Plus className="h-3.5 w-3.5 mr-2" />
        Add Ingredient
      </Button>
    </div>
  );

  const MobileLegacy = (
    <div
      className={cn(
        "md:hidden space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-primary font-semibold",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Help us grow our ingredient database!</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed font-normal">
        Can&apos;t find your ingredient? Add it to help other users create amazing meals!
      </p>
      <Button
        onClick={handleOpen}
        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold py-2 px-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
      >
        <Plus className="w-3.5 h-3.5 mr-2" />
        Add New Ingredient
      </Button>
    </div>
  );

  return (
    <>
      {variant === "banner" ? DesktopBanner : MobileLegacy}

      <AddIngredientModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />
    </>
  );
};
