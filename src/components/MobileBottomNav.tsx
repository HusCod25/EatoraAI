import { Soup, Bookmark, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  activeTab: "generate" | "saved" | "profile";
  onTabChange: (tab: "generate" | "saved" | "profile") => void;
}

export const MobileBottomNav = ({ activeTab, onTabChange }: MobileBottomNavProps) => {
  const tabs = [
    {
      id: "saved" as const,
      icon: Bookmark,
      label: "Saved",
    },
    {
      id: "generate" as const,
      icon: Soup,
      label: "Generate",
    },
    {
      id: "profile" as const,
      icon: User,
      label: "Profile",
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors duration-200",
                isActive
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-primary hover:bg-muted/50"
              )}
            >
              <tab.icon className={cn("h-5 w-5 mb-1", isActive && "text-primary")} />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};