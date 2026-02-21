import { create } from "zustand";

interface ChatState {
  open: boolean;
  toggleChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  open: false,
  toggleChat: () => set({ open: !get().open }),
}));
