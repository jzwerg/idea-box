import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Inbox, Bot } from "lucide-react";
import { SignalShell } from "@/components/signal/SignalShell";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Settings — IdeaBox" }],
  }),
  component: SettingsLayout,
});

const SECTIONS = [
  {
    to: "/settings/sources",
    label: "Sources",
    Icon: Inbox,
    match: (p: string) => p.startsWith("/settings/sources"),
    description: "Where ideas flow in from.",
  },
  {
    to: "/settings/agent",
    label: "Brainstorm Agent",
    Icon: Bot,
    match: (p: string) => p.startsWith("/settings/agent"),
    description: "Tune scoring and learned rules.",
  },
] as const;

function SettingsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <SignalShell>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-0 min-h-0">
        <aside className="border-r border-border/60 bg-card/30 px-3 py-5">
          <div className="px-2 mb-3">
            <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Settings
            </h2>
          </div>
          <nav className="flex flex-col gap-0.5">
            {SECTIONS.map(({ to, label, Icon, match }) => {
              const active = match(pathname);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                    active
                      ? "bg-accent text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </SignalShell>
  );
}
