import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../api/index';

export const useUserStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoggedIn: false,
      hasHydrated: false,

      login: async (username, password) => {
        const res = await authAPI.login({ username, password });
        if (res.code === 200) {
          const { data } = res;
          set({
            user: {
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

      register: async (username, password, nickname, promoter_code) => {
        const res = await authAPI.register({ username, password, nickname, promoter_code });
        if (res.code === 200) {
          const { data } = res;
          set({
            user: {
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

      fetchUserInfo: async () => {
        try {
          const res = await authAPI.getInfo();
          if (res.code === 200) {
            set({ user: res.data });
          }
        } catch (error) {
          console.error('获取用户信息失败:', error);
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isLoggedIn: false
        });
      },

      updateProfile: async (nickname) => {
        await authAPI.update({ nickname });
        set((state) => ({
          user: { ...state.user, nickname }
        }));
      },

      setHasHydrated: () => {
        set({ hasHydrated: true });
      }
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn
      }),
      onRehydrateStorage: () => (state) => {
        state.setHasHydrated();
      }
    }
  )
);