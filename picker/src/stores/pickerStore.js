import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const storage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(name);
  },
  setItem: (name, value) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(name);
    }
  }
};

export const usePickerStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      login: (user, token) => {
        set({ user, token });
      },

      logout: () => {
        set({ user: null, token: null });
      },

      setUser: (user) => set({ user }),

      isLoggedIn: () => !!get().token
    }),
    {
      name: 'picker-storage',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        user: state.user,
        token: state.token
      })
    }
  )
);
