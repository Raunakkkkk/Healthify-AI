import { create } from "zustand";
import api from "@/lib/api";
import type { User, AuthResponse } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  hydrate: () => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (token && userStr) {
      try {
        set({ token, user: JSON.parse(userStr) });
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post<AuthResponse>("/auth/login", {
        email,
        password,
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
    } catch (err: any) {
      const msg =
        err.response?.data?.error || "Login failed. Please try again.";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  signup: async (name, email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post<AuthResponse>("/auth/signup", {
        name,
        email,
        password,
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
    } catch (err: any) {
      const msg =
        err.response?.data?.error || "Signup failed. Please try again.";
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ user: null, token: null });
  },

  setUser: (user: User) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },
}));
