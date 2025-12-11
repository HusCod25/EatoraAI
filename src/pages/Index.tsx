import { useState, useRef, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Layout, Header, MainContent, Sidebar, CenterPanel } from "@/components/Layout";
import { MealGenerator } from "@/components/MealGenerator";
import { SavedMeals } from "@/components/SavedMeals";
import { UserAccount } from "@/components/UserAccount";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ChefHat, Sparkles } from "lucide-react";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

const Index = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"generate" | "saved" | "profile">("generate");
  const [visitedTabs, setVisitedTabs] = useState<Set<"generate" | "saved" | "profile">>(() => new Set(["generate"]));
  const savedMealsRef = useRef<{ refreshMeals: () => void } | null>(null);

  // Handle /account route - show profile tab
  useEffect(() => {
    if (location.pathname === '/account') {
      setActiveTab('profile');
    }
  }, [location.pathname]);

  const handleMealGenerated = () => {
    logger.debug('handleMealGenerated called');
    
    // For mobile, switch to saved tab
    setActiveTab("saved");
    
    // For desktop, trigger refresh of SavedMeals component with multiple attempts
    logger.debug('Triggering desktop refresh...');
    
    // Try immediate refresh
    setTimeout(() => {
      logger.debug('First refresh attempt');
      savedMealsRef.current?.refreshMeals();
    }, 500);
    
    // Try again after 1.5 seconds
    setTimeout(() => {
      logger.debug('Second refresh attempt');
      savedMealsRef.current?.refreshMeals();
    }, 1500);
    
    // Final attempt after 3 seconds
    setTimeout(() => {
      logger.debug('Final refresh attempt');
      savedMealsRef.current?.refreshMeals();
    }, 3000);
  };

  const handleMealsUpdated = () => {
    logger.debug('Meals updated - refreshing SavedMeals');
    savedMealsRef.current?.refreshMeals();
  };

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const mobileTabs: { id: "generate" | "saved" | "profile"; render: () => JSX.Element }[] = [
    {
      id: "generate",
      render: () => <MealGenerator onMealGenerated={handleMealGenerated} onMealsUpdated={handleMealsUpdated} />
    },
    {
      id: "saved",
      render: () => <SavedMeals />
    },
    {
      id: "profile",
      render: () => <UserAccount />
    }
  ];

  return (
    <Layout>
      <Header className="flex items-start justify-start gap-3 lg:w-full">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-card/80 px-3 py-2 shadow-card">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
            <ChefHat className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary">EatoraAI™</h1>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              AI Meal Magic
            </p>
          </div>
        </div>
      </Header>

      {/* Desktop Layout */}
      <MainContent className="hidden lg:flex">
        <div className="app-wrapper">
          <Sidebar className="column-card column-left">
            <SavedMeals ref={savedMealsRef} />
          </Sidebar>

          <CenterPanel className="column-card column-center">
            <MealGenerator onMealGenerated={handleMealGenerated} onMealsUpdated={handleMealsUpdated} />
          </CenterPanel>

          <Sidebar className="column-card column-right">
            <UserAccount />
          </Sidebar>
        </div>
      </MainContent>

      {/* Mobile Layout */}
      <MainContent className="lg:hidden pb-20">
        <CenterPanel className="w-full relative min-h-[70vh]">
          {mobileTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const shouldRender = visitedTabs.has(tab.id);
            return (
              <div
                key={tab.id}
                className={cn(
                  "transition-opacity duration-200",
                  isActive ? "opacity-100 relative" : "opacity-0 pointer-events-none absolute inset-0"
                )}
                aria-hidden={!isActive}
              >
                {shouldRender && tab.render()}
              </div>
            );
          })}
        </CenterPanel>
      </MainContent>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </Layout>
  );
};

export default Index;
