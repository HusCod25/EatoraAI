import { Star, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubtlePlanPromptProps {
  message: string;
  onUpgrade: () => void;
  type?: 'limit' | 'feature';
}

export const SubtlePlanPrompt = ({ 
  message, 
  onUpgrade,
  type = 'limit'
}: SubtlePlanPromptProps) => {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-muted">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {type === 'limit' ? (
          <Lock className="h-3 w-3" />
        ) : (
          <Star className="h-3 w-3" />
        )}
        <span>{message}</span>
      </div>
      <Button
        onClick={onUpgrade}
        size="sm"
        variant="outline"
        className="h-7 px-3 text-xs"
      >
        Upgrade
      </Button>
    </div>
  );
};