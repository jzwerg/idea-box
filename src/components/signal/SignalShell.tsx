import { Link, useRouterState } from "@tanstack/react-router";
import { Package, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { FloatingAgent } from "./FloatingAgent";

export function SignalShell({
  children,
  rightSlot,
}: {
  children: ReactNode;
  rightSlot?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const settingsActive = pathname.startsWith("/settings");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="px-6 py-3 flex items-center justify-between">
          <Link to="/box" className="flex items-center gap-2 group">
            <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center transition-transform group-hover:scale-105">
              <Package className="h-3.5 w-3.5 text-background" strokeWidth={2.5} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <h1 className="font-display font-semibold tracking-tight text-lg text-foreground">
                IdeaBox
              </h1>
              <span className="text-[10px] text-muted-foreground font-mono">v0.4</span>
            </div>
          </Link>
          <div className="flex items-center gap-5 text-xs">
            {rightSlot}
            <Link
              to="/settings/sources"
              aria-label="Settings"
              title="Settings"
              className={`flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
                settingsActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              }`}
            >
              <Settings className="h-4 w-4" strokeWidth={2.25} />
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col min-h-0">{children}</main>
      <FloatingAgent />
    </div>
  );
}
