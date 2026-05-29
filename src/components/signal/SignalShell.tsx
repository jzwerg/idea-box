import { Link } from "@tanstack/react-router";
import { Package, Settings, Inbox, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FloatingAgent } from "./FloatingAgent";

export function SignalShell({
  children,
  headerInline,
}: {
  children: ReactNode;
  /** Optional slot rendered on the left of the header — used for the
   *  collapsed stage/view switcher when the page is scrolled. */
  headerInline?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border/60 bg-background/85 backdrop-blur-xl sticky top-0 z-30">
        <div className="px-6 py-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Left: collapsed stage/view picker slot */}
          <div className="flex items-center min-w-0 justify-self-start">
            {headerInline}
          </div>

          {/* Center: icon + name */}
          <Link to="/box" className="flex items-center gap-2.5 group justify-self-center">
            <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center transition-transform group-hover:scale-105">
              <Package className="h-3.5 w-3.5 text-background" strokeWidth={2.5} />
            </div>
            <span className="font-display font-semibold tracking-tight text-[15px] text-foreground leading-none">
              IdeaBox
            </span>
          </Link>

          {/* Right: settings */}
          <div className="justify-self-end flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Settings"
                title="Settings"
                className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors data-[state=open]:bg-accent data-[state=open]:text-foreground outline-none"
              >
                <Settings className="h-4 w-4" strokeWidth={2.25} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-52">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-normal">
                  Configure
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/settings/sources" className="gap-2 cursor-pointer">
                    <Inbox className="h-4 w-4" strokeWidth={2.25} />
                    <span>Sources</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings/agent" className="gap-2 cursor-pointer">
                    <Sparkles className="h-4 w-4" strokeWidth={2.25} />
                    <span>Agent</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings/sources" className="gap-2 cursor-pointer text-muted-foreground text-xs">
                    <Settings className="h-3.5 w-3.5" strokeWidth={2.25} />
                    <span>All settings</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
      <FloatingAgent />
    </div>
  );
}
