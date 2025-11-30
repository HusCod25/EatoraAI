import { AlertCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LimitReachedPromptProps {
  limitType: string;
  currentUsage: number;
  maxLimit: number;
  onUpgrade: () => void;
}

export const LimitReachedPrompt = ({ 
  limitType, 
  currentUsage, 
  maxLimit,
  onUpgrade 
}: LimitReachedPromptProps) => {
  return (
    <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
      <AlertCircle className="h-4 w-4 text-red-600" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <span className="text-red-800 dark:text-red-200">
            You've reached your <strong>{limitType}</strong> limit ({currentUsage}/{maxLimit}). 
            Upgrade your plan to continue using this feature.
          </span>
        </div>
        <Button
          onClick={onUpgrade}
          size="sm"
          className="ml-4 bg-red-600 hover:bg-red-700 text-white"
        >
          <Star className="h-3 w-3 mr-1" />
          Upgrade
        </Button>
      </AlertDescription>
    </Alert>
  );
};