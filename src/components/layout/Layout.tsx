import { Outlet, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ChatPanel from "@/components/chat/ChatPanel";

export default function Layout() {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <ChatPanel />
    </div>
  );
}
