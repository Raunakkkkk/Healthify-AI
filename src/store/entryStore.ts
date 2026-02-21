import { create } from "zustand";
import api from "@/lib/api";
import type { FoodEntry, PaginatedResponse } from "@/types";

interface EntryState {
  entries: FoodEntry[];
  pagination: { page: number; limit: number; total: number; pages: number };
  loading: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  fetchEntries: (params?: Record<string, string>) => Promise<void>;
  createEntry: (entry: Partial<FoodEntry>) => Promise<FoodEntry>;
  updateEntry: (id: string, entry: Partial<FoodEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export const useEntryStore = create<EntryState>((set, get) => ({
  entries: [],
  pagination: { page: 1, limit: 50, total: 0, pages: 0 },
  loading: false,
  selectedDate: todayStr(),

  setSelectedDate: (date) => {
    set({ selectedDate: date });
    get().fetchEntries();
  },

  fetchEntries: async (params) => {
    set({ loading: true });
    try {
      const date = get().selectedDate;
      const start = `${date}T00:00:00.000Z`;
      const end = `${date}T23:59:59.999Z`;

      const { data } = await api.get<PaginatedResponse<FoodEntry>>(
        "/entries",
        {
          params: { start, end, limit: "50", sort: "-timestamp", ...params },
        }
      );
      set({
        entries: data.entries,
        pagination: data.pagination,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  createEntry: async (entry) => {
    const { data } = await api.post<FoodEntry>("/entries", entry);
    const current = get().entries;
    set({ entries: [data, ...current] });
    return data;
  },

  updateEntry: async (id, entry) => {
    const { data } = await api.put<FoodEntry>(`/entries/${id}`, entry);
    set({
      entries: get().entries.map((e) => (e._id === id ? data : e)),
    });
  },

  deleteEntry: async (id) => {
    await api.delete(`/entries/${id}`);
    set({ entries: get().entries.filter((e) => e._id !== id) });
  },
}));
