import { create } from "zustand";
import api from "@/lib/api";
import type { Goal } from "@/types";

interface GoalState {
  currentGoal: Goal | null;
  goals: Goal[];
  loading: boolean;
  fetchCurrentGoal: () => Promise<void>;
  fetchAllGoals: () => Promise<void>;
  createGoal: (goal: Partial<Goal>) => Promise<void>;
  updateGoal: (id: string, goal: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  currentGoal: null,
  goals: [],
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

  fetchAllGoals: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/goals");
      set({ goals: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createGoal: async (goal) => {
    const { data } = await api.post("/goals", {
      ...goal,
      startDate: new Date().toISOString(),
    });
    set({ currentGoal: data });
  },

  updateGoal: async (id, goal) => {
    const { data } = await api.put(`/goals/${id}`, goal);
    set({ currentGoal: data });
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
