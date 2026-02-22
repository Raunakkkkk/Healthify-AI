import { LogOut, User as UserIcon, Sun, Moon, Salad, Menu } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export default function Header({ onMobileMenuToggle }: HeaderProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        {onMobileMenuToggle && (
          <Button
            variant="outline"
            size="icon"
            onClick={onMobileMenuToggle}
            className="h-9 w-9 shrink-0 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Salad className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">NutriTrack</span>
        </Link>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 text-muted-foreground hover:text-foreground md:h-10 md:w-10"
              aria-label={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" aria-hidden />
              ) : (
                <Moon className="h-4 w-4" aria-hidden />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </TooltipContent>
        </Tooltip>

        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 transition-colors hover:bg-secondary/80 md:px-4 md:py-2.5"
        >
          <UserIcon className="h-4 w-4 text-muted-foreground md:h-5 md:w-5" />
          <span className="hidden text-sm font-medium text-foreground sm:inline md:text-base">
            {user?.name}
          </span>
        </button>

        <button
          onClick={logout}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive md:p-2.5"
          title="Logout"
        >
          <LogOut className="h-4 w-4 md:h-5 md:w-5" />
        </button>
      </div>
    </header>
  );
}
