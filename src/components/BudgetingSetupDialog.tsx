import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { DollarSign, Globe, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BudgetingSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCountry?: string;
  currentCurrency?: string;
  onCompleted?: () => void;
}

// Top 20 most used currencies
const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "RON", name: "Romanian Leu", symbol: "lei" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft" },
];

// Common countries list (can be expanded)
const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany", "France", 
  "Italy", "Spain", "Netherlands", "Belgium", "Switzerland", "Austria", "Sweden", 
  "Norway", "Denmark", "Finland", "Ireland", "Portugal", "Greece", "Poland", 
  "Czech Republic", "Hungary", "Romania", "Japan", "China", "South Korea", 
  "India", "Singapore", "Hong Kong", "Taiwan", "Thailand", "Malaysia", "Indonesia", 
  "Philippines", "Vietnam", "Brazil", "Mexico", "Argentina", "Chile", "Colombia", 
  "Peru", "South Africa", "Egypt", "Nigeria", "Kenya", "Israel", "Turkey", 
  "United Arab Emirates", "Saudi Arabia", "Russia", "Ukraine", "New Zealand",
  "Iceland", "Barbados", "Luxembourg"
].sort();

export const BudgetingSetupDialog = ({ 
  open, 
  onOpenChange,
  currentCountry = "",
  currentCurrency = "USD",
  onCompleted,
}: BudgetingSetupDialogProps) => {
  const { user } = useAuth();
  const [country, setCountry] = useState(currentCountry);
  const [currency, setCurrency] = useState(currentCurrency);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const isAlreadySetup = !!currentCountry; // Check only country since currency defaults to USD

  const handleSaveClick = () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    if (!country) {
      toast.error("Please select a country");
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmDialog(false);
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          country,
          currency,
          budgeting_enabled: true,
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      toast.success("Budgeting settings saved!");
      onOpenChange(false);
      if (onCompleted) {
        onCompleted();
      }
    } catch (error: any) {
      console.error('Error saving budgeting settings:', error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Budgeting Setup
            </DialogTitle>
            <DialogDescription>
              Set up your location and currency to track how much money you save by cooking at home.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Warning if already setup */}
            {isAlreadySetup && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> Once saved, you can only change these settings by contacting support at <a href="mailto:support@snacksy.app" className="underline">support@snacksy.app</a>
                  </p>
                </div>
              </div>
            )}

            {/* Country Selection */}
            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Country
              </Label>
              <Select value={country} onValueChange={setCountry} disabled={isAlreadySetup}>
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Currency Selection */}
            <div className="space-y-2">
              <Label htmlFor="currency" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Currency
              </Label>
              <Select value={currency} onValueChange={setCurrency} disabled={isAlreadySetup}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code} - {curr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Info Box */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                💡 This information helps us calculate how much money you save compared to eating out or ordering delivery in your area.
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            {!isAlreadySetup && (
              <Button 
                onClick={handleSaveClick}
                disabled={saving || !country}
              >
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            )}
            {isAlreadySetup && (
              <Button 
                variant="outline"
                onClick={() => window.location.href = "mailto:support@snacksy.app?subject=Change%20Budgeting%20Settings"}
              >
                Contact Support
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Budgeting Settings
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>
                You are about to save the following budgeting settings:
              </p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p><strong>Country:</strong> {country}</p>
                <p><strong>Currency:</strong> {CURRENCIES.find(c => c.code === currency)?.name} ({currency})</p>
              </div>
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ Important: After saving, you will only be able to change these settings by contacting support via email.
              </p>
              <p>
                Are you sure you want to continue?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Yes, Save Settings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
