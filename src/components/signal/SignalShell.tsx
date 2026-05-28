import { Link, useRouterState } from "@tanstack/react-router";
import { Radio } from "lucide-react";
import type { ReactNode } from "react";
import { AgentStrip } from "./AgentStrip";

const NAV: Array<{ to: string; label: string; match: (p: string) => boolean }> = [
  { to: "/ingestion", label: "Sources", match: (p) => p.startsWith("/ingestion") || p.startsWith("/sources") },
  { to: "/staging", label: "Staging", match: (p) => p === "/" || p.startsWith("/staging") },
  { to: "/outcome", label: "Outcome", match: (p) => p.startsWith("/outcome") },
  { to: "/agent", label: "Agent", match: (p) => p.startsWith("/agent") },
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
      <header className="border-b bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/staging" className="flex items-center gap-2">
              <div className="relative">
                <Radio className="h-5 w-5 text-primary" />
                <div className="absolute inset-0 animate-ping">
                  <Radio className="h-5 w-5 text-primary opacity-30" />
                </div>
              </div>
              <h1 className="font-semibold tracking-tight text-lg">Signal</h1>
              <span className="text-xs text-muted-foreground font-mono ml-1">v0.2</span>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map((t) => {
                const active = t.match(pathname);
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      active
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-6 text-xs">{rightSlot}</div>
        </div>
      </header>
      <AgentStrip />
      {children}
    </div>
  );
}
