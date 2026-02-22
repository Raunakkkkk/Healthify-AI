import { create } from "zustand";
import api from "@/lib/api";
import type { FoodEntry, PaginatedResponse } from "@/types";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
} from "date-fns";
import { todayLocalDateStr } from "@/lib/utils";

export type RangeMode = "day" | "week" | "month" | "quarter";

interface EntryState {
  entries: FoodEntry[];
  pagination: { page: number; limit: number; total: number; pages: number };
  loading: boolean;
  selectedDate: string;
  rangeMode: RangeMode;
  setSelectedDate: (date: string) => void;
  setRangeMode: (mode: RangeMode) => void;
  fetchEntries: (page?: number) => Promise<void>;
  createEntry: (entry: Partial<FoodEntry>) => Promise<FoodEntry>;
  updateEntry: (id: string, entry: Partial<FoodEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  getDateRange: () => { start: Date; end: Date };
}

function todayStr() {
  return todayLocalDateStr();
}

function computeRange(dateStr: string, mode: RangeMode) {
  const d = new Date(dateStr + "T12:00:00");
  switch (mode) {
    case "day":
      return { start: startOfDay(d), end: endOfDay(d) };
    case "week":
      return {
        start: startOfWeek(d, { weekStartsOn: 1 }),
        end: endOfWeek(d, { weekStartsOn: 1 }),
      };
    case "month":
      return { start: startOfMonth(d), end: endOfMonth(d) };
    case "quarter":
      return { start: startOfQuarter(d), end: endOfQuarter(d) };
  }
}

export const useEntryStore = create<EntryState>((set, get) => ({
  entries: [],
  pagination: { page: 1, limit: 15, total: 0, pages: 0 },
  loading: false,
  selectedDate: todayStr(),
  rangeMode: "day" as RangeMode,

  getDateRange: () => computeRange(get().selectedDate, get().rangeMode),

  setSelectedDate: (date) => {
    set({ selectedDate: date, pagination: { ...get().pagination, page: 1 } });
    get().fetchEntries(1);
  },

  setRangeMode: (mode) => {
    set({ rangeMode: mode, pagination: { ...get().pagination, page: 1 } });
    get().fetchEntries(1);
  },

  fetchEntries: async (page?: number) => {
    set({ loading: true });
    try {
      const { start, end } = computeRange(get().selectedDate, get().rangeMode);
      const p = page ?? get().pagination.page;

      const { data } = await api.get<PaginatedResponse<FoodEntry>>("/entries", {
        params: {
          start: start.toISOString(),
          end: end.toISOString(),
          page: String(p),
          limit: String(get().pagination.limit),
          sort: "-timestamp",
        },
      });
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
    get().fetchEntries(1);
    return data;
  },

  updateEntry: async (id, entry) => {
    const { data } = await api.put<FoodEntry>(`/entries/${id}`, entry);
    set({
      entries: get().entries.map((e) => (e._id === id ? data : e)),
    });
    get().fetchEntries(get().pagination.page);
  },

  deleteEntry: async (id) => {
    await api.delete(`/entries/${id}`);
    get().fetchEntries();
  },
}));
