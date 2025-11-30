import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette, Sun, Moon, Gem } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

type Theme = 'light' | 'diamond';

export const ThemeChanger = () => {
  const { subscription } = useSubscription();
  const [currentTheme, setCurrentTheme] = useState<Theme>('light');
  
  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    root.classList.remove('diamond');
    
    if (theme === 'diamond') {
      root.classList.add('diamond');
    }
    
    setCurrentTheme(theme);
  };

  const getAvailableThemes = () => {
    const themes = [{ id: 'light', name: 'Light', icon: Sun }];
    
    // Diamond theme only for unlimited
    if (subscription?.plan === 'unlimited') {
      themes.push({ id: 'diamond', name: '💎 Diamond', icon: Gem });
    }
    
    return themes;
  };

  const availableThemes = getAvailableThemes();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-8 px-3 text-xs"
        >
          <Palette className="h-3 w-3 mr-1" />
          Theme
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground mb-2">Choose Theme</div>
          {availableThemes.map(({ id, name, icon: Icon }) => (
            <Button
              key={id}
              variant={currentTheme === id ? "default" : "ghost"}
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => applyTheme(id as Theme)}
            >
              <Icon className="h-3 w-3 mr-2" />
              {name}
            </Button>
          ))}
          {subscription?.plan === 'free' && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Upgrade to access more themes
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};