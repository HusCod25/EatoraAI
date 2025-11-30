import { AlertTriangle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PlanUpgradePromptProps {
  feature: string;
  currentPlan: string;
  requiredPlan?: string;
  onUpgrade: () => void;
}

export const PlanUpgradePrompt = ({ 
  feature, 
  currentPlan, 
  requiredPlan = "Beginner Plan",
  onUpgrade 
}: PlanUpgradePromptProps) => {
  return (
    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <span className="text-amber-800 dark:text-amber-200">
            <strong>{feature}</strong> is not available on your current {currentPlan}. 
            Upgrade to <strong>{requiredPlan}</strong> to unlock this feature.
          </span>
        </div>
        <Button
          onClick={onUpgrade}
          size="sm"
          className="ml-4 bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Star className="h-3 w-3 mr-1" />
          Upgrade
        </Button>
      </AlertDescription>
    </Alert>
  );
};