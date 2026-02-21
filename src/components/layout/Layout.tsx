import { Outlet, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ChatPanel from "@/components/chat/ChatPanel";
import ChatFab from "@/components/chat/ChatFab";

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const chatOpen = useChatStore((s) => s.open);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <TooltipProvider delayDuration={0}>
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <ChatPanel />
      {!chatOpen && <ChatFab />}
    </div>
    </TooltipProvider>
  );
}
