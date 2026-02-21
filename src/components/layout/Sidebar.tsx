import { NavLink } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  UtensilsCrossed,
  BarChart3,
  Target,
  Menu,
  X,
  Salad,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const links = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/meals", icon: UtensilsCrossed, label: "Meals" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
  { to: "/goals", icon: Target, label: "Goals" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile hamburger */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-200 md:static md:z-0",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b px-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Salad className="h-5 w-5" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight">NutriTrack</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-2">
          {links.map((link) => {
            const item = (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-0",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <link.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{link.label}</span>}
              </NavLink>
            );

            if (collapsed) {
              return (
                <Tooltip key={link.to}>
                  <TooltipTrigger asChild>{item}</TooltipTrigger>
                  <TooltipContent side="right">{link.label}</TooltipContent>
                </Tooltip>
              );
            }

            return item;
          })}
        </nav>

        {/* Collapse toggle — desktop only */}
        <div className="hidden border-t p-2 md:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("w-full justify-start gap-2", collapsed && "justify-center px-0")}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && <span className="text-xs">Collapse</span>}
          </Button>
        </div>

        {/* Mobile close */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(false)}
          className="absolute right-2 top-3.5 md:hidden"
        >
          <X className="h-4 w-4" />
        </Button>
      </aside>
    </TooltipProvider>
  );
}
