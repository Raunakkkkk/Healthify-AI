import { NavLink } from "react-router-dom";
import { type FC, useState } from "react";
import {
  LayoutDashboard,
  UtensilsCrossed,
  BarChart3,
  Target,
  UserCircle,
  Menu,
  X,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const links = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/meals", icon: UtensilsCrossed, label: "Meals" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
  { to: "/goals", icon: Target, label: "Goals" },
  { to: "/profile", icon: UserCircle, label: "Profile" },
];

export interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const Sidebar: FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
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
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Collapse toggle only */}
        <div
          className={cn(
            "flex h-16 shrink-0 border-b flex-row items-center px-3",
            collapsed ? "justify-center" : "justify-end",
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "hidden shrink-0 md:flex",
              collapsed ? "h-9 w-9" : "h-8 w-8",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Nav */}
        <nav className={cn("flex-1 space-y-1", collapsed ? "px-3 py-3" : "p-3")}>
          {links.map((link) => {
            const item = (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors",
                    collapsed ? "justify-center px-2 min-w-[2.25rem]" : "px-3",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    collapsed && isActive && "bg-primary/15",
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
                  <TooltipContent
                    side="right"
                    sideOffset={8}
                    className="border-border/80 bg-popover px-3 py-2 text-sm font-medium shadow-lg"
                  >
                    {link.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return item;
          })}
        </nav>

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
    </>
  );
};

export default Sidebar;
