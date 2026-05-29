import { Link, useRouterState } from "@tanstack/react-router";
import { Package } from "lucide-react";
import type { ReactNode } from "react";
import { FloatingAgent } from "./FloatingAgent";

const NAV: Array<{ to: string; label: string; emoji: string; match: (p: string) => boolean }> = [
  { to: "/ingestion", label: "Sources", emoji: "📥", match: (p) => p.startsWith("/ingestion") || p.startsWith("/sources") },
  { to: "/box", label: "Box", emoji: "📦", match: (p) => p === "/" || p.startsWith("/box") || p.startsWith("/staging") || p.startsWith("/outcome") },
  { to: "/agent", label: "Agent", emoji: "🤖", match: (p) => p.startsWith("/agent") },
];

export function SignalShell({
  children,
  rightSlot,
}: {
  children: ReactNode;
  rightSlot?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/box" className="flex items-center gap-2 group">
              <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center transition-transform group-hover:scale-105">
                <Package className="h-3.5 w-3.5 text-background" strokeWidth={2.5} />
              </div>
              <div className="flex items-baseline gap-1.5">
                <h1 className="font-display font-semibold tracking-tight text-lg text-foreground">
                  IdeaBox
                </h1>
                <span className="text-[10px] text-muted-foreground font-mono">v0.3</span>
              </div>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map((t) => {
                const active = t.match(pathname);
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    className={`px-3 py-1.5 text-sm rounded-full transition-all flex items-center gap-1.5 ${
                      active
                        ? "bg-primary/15 text-foreground font-medium shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                    }`}
                  >
                    <span className="text-base leading-none">{t.emoji}</span>
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-6 text-xs">{rightSlot}</div>
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
      <FloatingAgent />
    </div>
  );
}
