import { LogOut, MessageSquare, User as UserIcon } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";

export default function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toggleChat = useChatStore((s) => s.toggleChat);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="ml-12 md:ml-0">
        <h2 className="text-lg font-semibold text-slate-800">
          Welcome back, {user?.name?.split(" ")[0]}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleChat}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">AI Chat</span>
        </button>

        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
          <UserIcon className="h-4 w-4 text-slate-500" />
          <span className="hidden text-sm font-medium text-slate-700 sm:inline">
            {user?.name}
          </span>
        </div>

        <button
          onClick={logout}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
