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
        console.log('🔐 登录 - 存储用户和 token:', { user, token });
        set({ user, token });
      },

      logout: () => {
        console.log('🚪 登出');
        set({ user: null, token: null });
      },

      setUser: (user) => set({ user }),

      isLoggedIn: () => {
        const token = get().token;
        console.log('🔑 检查登录状态:', { token, isLoggedIn: !!token });
        return !!token;
      }
    }),
    {
      name: 'picker-storage',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        user: state.user,
        token: state.token
      }),
      onRehydrateStorage: () => {
        return (state) => {
          console.log('💾 从存储中恢复状态:', state);
        };
      }
    }
  )
);
