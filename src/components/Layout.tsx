import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

export const Layout = ({ children, className }: LayoutProps) => {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {children}
    </div>
  );
};

export const Header = ({ children, className }: LayoutProps) => {
  return (
    <header className={cn("border-b border-border bg-white shadow-sm", className)}>
      {children}
    </header>
  );
};

export const MainContent = ({ children, className }: LayoutProps) => {
  return (
    <main className={cn("flex-1 flex", className)}>
      {children}
    </main>
  );
};

export const Sidebar = ({ children, className }: LayoutProps) => {
  return (
    <aside className={cn(
      "w-80 bg-white border-r border-border p-6",
      className
    )}>
      {children}
    </aside>
  );
};

export const CenterPanel = ({ children, className }: LayoutProps) => {
  return (
    <section className={cn("flex-1 p-6 bg-white", className)}>
      {children}
    </section>
  );
};