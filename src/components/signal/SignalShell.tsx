import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Brain, Radio } from "lucide-react";
import type { ReactNode } from "react";
import { useAgent } from "@/lib/agent-context";

const NAV: Array<{ to: string; label: string; exact?: boolean }> = [
  { to: "/", label: "Staging", exact: true },
  { to: "/ingestion", label: "Ingestion" },
  { to: "/agent", label: "Agent" },
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
            <Link to="/" className="flex items-center gap-2">
              <div className="relative">
                <Radio className="h-5 w-5 text-primary" />
                <div className="absolute inset-0 animate-ping">
                  <Radio className="h-5 w-5 text-primary opacity-30" />
                </div>
              </div>
              <h1 className="font-semibold tracking-tight text-lg">Signal</h1>
              <span className="text-xs text-muted-foreground font-mono ml-1">v0.1</span>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map((t) => {
                const active = t.exact
                  ? pathname === t.to
                  : pathname === t.to || pathname.startsWith(t.to + "/");
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
          <div className="flex items-center gap-6 text-xs">
            {rightSlot}
            <div className="flex items-center gap-1.5 pl-6 border-l">
              <Activity className="h-3.5 w-3.5 text-chart-2" />
              <span className="text-muted-foreground">Ingesting</span>
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
