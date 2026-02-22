import { create } from "zustand";
import api from "@/lib/api";
import type { Goal } from "@/types";

interface GoalPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface GoalState {
  currentGoal: Goal | null;
  goals: Goal[];
  pagination: GoalPagination;
  loading: boolean;
  fetchCurrentGoal: () => Promise<void>;
  fetchAllGoals: (page?: number) => Promise<void>;
  createGoal: (goal: Partial<Goal>) => Promise<void>;
  updateGoal: (id: string, goal: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  currentGoal: null,
  goals: [],
  pagination: { page: 1, limit: 20, total: 0, pages: 0 },
  loading: false,

  fetchCurrentGoal: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/goals", {
        params: { date: new Date().toISOString() },
      });
      set({ currentGoal: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchAllGoals: async (page?: number) => {
    set({ loading: true });
    try {
      const p = page ?? get().pagination.page;
      const { data } = await api.get("/goals", {
        params: { page: String(p), limit: String(get().pagination.limit) },
      });
      set({
        goals: data.goals,
        pagination: data.pagination,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  createGoal: async (goal) => {
    const { data } = await api.post("/goals", {
      ...goal,
      startDate: goal.startDate
        ? new Date(goal.startDate).toISOString()
        : new Date().toISOString(),
    });
    set((s) => ({
      goals: [data, ...s.goals],
      currentGoal: data,
    }));
  },

  updateGoal: async (id, goal) => {
    const { data } = await api.put(`/goals/${id}`, goal);
    set((s) => ({
      goals: s.goals.map((g) => (g._id === id ? data : g)),
      currentGoal: s.currentGoal?._id === id ? data : s.currentGoal,
    }));
  },

  deleteGoal: async (id) => {
    await api.delete(`/goals/${id}`);
    const remaining = get().goals.filter((g) => g._id !== id);
    const isCurrentDeleted = get().currentGoal?._id === id;
    set({
      goals: remaining,
      currentGoal: isCurrentDeleted ? null : get().currentGoal,
    });
  },
}));
