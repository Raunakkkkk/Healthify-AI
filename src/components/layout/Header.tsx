import { LogOut, User as UserIcon, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export default function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <header className="flex h-14 shrink-0 items-center justify-end border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
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
          className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 transition-colors hover:bg-secondary/80"
        >
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <span className="hidden text-sm font-medium text-foreground sm:inline">
            {user?.name}
          </span>
        </button>

        <button
          onClick={logout}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
