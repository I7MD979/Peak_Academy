"use client";

import { create } from "zustand";

export const useAuthStore = create((set) => ({
  user: null,
  session: null,
  loading: true,
  setAuth: ({ user, session }) =>
    set((state) => ({
      user: user ?? null,
      session: session ?? null,
      loading: false
    })),
  setLoading: (loading) =>
    set((state) => (state.loading === loading ? state : { loading })),
  clearAuth: () => set({ user: null, session: null, loading: false })
}));
