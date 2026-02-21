import { MessageCircle } from "lucide-react";
import { useChatStore } from "@/store/chatStore";

export default function ChatFab() {
  const toggleChat = useChatStore((s) => s.toggleChat);

  return (
    <button
      onClick={toggleChat}
      className="group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_4px_20px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-105 hover:shadow-[0_6px_28px_rgba(16,185,129,0.55)] active:scale-95"
      aria-label="Open AI Chat"
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-emerald-400 opacity-0 animate-[fab-ping_2s_ease-out_infinite]" />

      <MessageCircle className="relative h-6 w-6 drop-shadow-sm transition-transform duration-300 group-hover:-rotate-12" />

      <span className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-md transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-0.5">
        Ask AI
        <span className="absolute left-1/2 top-full -ml-1 h-2 w-2 -translate-y-1 rotate-45 bg-slate-900" />
      </span>

      <style>{`
        @keyframes fab-ping {
          0% { transform: scale(1); opacity: 0.35; }
          70% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </button>
  );
}
