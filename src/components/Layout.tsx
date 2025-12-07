import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

export const Layout = ({ children, className }: LayoutProps) => {
  return (
    <div className="min-h-screen text-foreground">
      <div
        className={cn(
          "relative mx-auto flex min-h-screen w-full max-w-[1200px] flex-col gap-4 px-4 pb-4 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pt-4",
          className
        )}
      >
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-80">
          <div className="absolute -left-10 top-0 h-48 w-48 rounded-full bg-primary/20 blur-[140px]" />
          <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-accent/20 blur-[170px]" />
        </div>
        {children}
      </div>
    </div>
  );
};

export const Header = ({ children, className }: LayoutProps) => {
  return (
    <header
      className={cn(
        "flex items-center gap-3 lg:fixed lg:left-4 lg:top-4 lg:z-20",
        className
      )}
    >
      {children}
    </header>
  );
};

export const MainContent = ({ children, className }: LayoutProps) => {
  return (
    <main
      className={cn(
        "flex-1 flex flex-col gap-6 lg:flex-row lg:items-start",
        className
      )}
    >
      {children}
    </main>
  );
};

export const Sidebar = ({ children, className }: LayoutProps) => {
  return (
    <aside className={cn(
      "w-full flex-shrink-0 rounded-[2rem] border border-white/10 bg-card/70 p-6 shadow-card backdrop-blur-xl",
      className
    )}>
      {children}
    </aside>
  );
};

export const CenterPanel = ({ children, className }: LayoutProps) => {
  return (
    <section
      className={cn(
        "flex-1 rounded-[2rem] border border-white/10 bg-card/90 p-6 shadow-[0_40px_120px_rgba(3,6,20,0.6)] backdrop-blur-xl",
        className
      )}
    >
      {children}
    </section>
  );
};