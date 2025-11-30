import { useState, useRef, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Layout, Header, MainContent, Sidebar, CenterPanel } from "@/components/Layout";
import { MealGenerator } from "@/components/MealGenerator";
import { SavedMeals } from "@/components/SavedMeals";
import { UserAccount } from "@/components/UserAccount";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ChefHat, Sparkles } from "lucide-react";
import { logger } from "@/lib/logger";

const Index = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"generate" | "saved" | "profile">("generate");
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

  const renderMobileContent = () => {
    switch (activeTab) {
      case "saved":
        return <SavedMeals />;
      case "profile":
        return <UserAccount />;
      default:
        return <MealGenerator onMealGenerated={handleMealGenerated} />;
    }
  };

  return (
    <Layout>
      {/* Header */}
      <Header className="h-16 px-6 flex items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <ChefHat className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">
              chompsy.ai
            </h1>
            <p className="text-xs text-muted-foreground">AI-Powered Meal Magic</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            <Sparkles className="h-3 w-3" />
            MVP Version
          </div>
        </div>
      </Header>

      {/* Desktop Layout */}
      <MainContent className="hidden lg:flex">
        {/* Left Sidebar - Saved Meals */}
        <Sidebar>
          <SavedMeals ref={savedMealsRef} />
        </Sidebar>

        {/* Center Panel - Meal Generator */}
        <CenterPanel className="max-w-4xl mx-auto">
          <MealGenerator onMealGenerated={handleMealGenerated} />
        </CenterPanel>

        {/* Right Sidebar - User Account */}
        <Sidebar>
          <UserAccount />
        </Sidebar>
      </MainContent>

      {/* Mobile Layout */}
      <MainContent className="lg:hidden pb-20">
        <CenterPanel className="w-full">
          {renderMobileContent()}
        </CenterPanel>
      </MainContent>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </Layout>
  );
};

export default Index;
