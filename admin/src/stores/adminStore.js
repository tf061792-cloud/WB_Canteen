import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authAPI } from '../api/index';

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

export const useAdminStore = create(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      isLoggedIn: false,

      login: async (username, password) => {
        const res = await authAPI.login({ username, password });
        if (res.code === 200) {
          const { data } = res;
          set({
            admin: {
              id: data.id,
              username: data.username,
              nickname: data.nickname,
              role: data.role
            },
            token: data.token,
            isLoggedIn: true
          });
          return true;
        }
        throw new Error(res.message);
      },

      fetchInfo: async () => {
        try {
          const res = await authAPI.getInfo();
          if (res.code === 200) {
            set({ admin: res.data });
          }
        } catch (error) {
          console.error('获取管理员信息失败:', error);
        }
      },

      logout: () => {
        set({
          admin: null,
          token: null,
          isLoggedIn: false
        });
      }
    }),
    {
      name: 'admin-storage',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        token: state.token,
        admin: state.admin,
        isLoggedIn: state.isLoggedIn
      })
    }
  )
);
