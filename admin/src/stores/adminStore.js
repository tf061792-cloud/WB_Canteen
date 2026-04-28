import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI, adminAPI } from '../api/index';

console.log('🏪 useAdminStore 初始化');

export const useAdminStore = create(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      isLoggedIn: false,
      permissions: [],
      isSuperadmin: false,

      login: async (username, password) => {
        console.log('🔐 尝试登录:', username);
        const res = await authAPI.login({ username, password });
        if (res.code === 200) {
          const { data } = res;
          console.log('✅ 登录成功:', data);
          // 存储 token 到 localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('admin_token', data.token);
            localStorage.setItem('admin', JSON.stringify({
              id: data.id,
              username: data.username,
              nickname: data.nickname,
              role: data.role
            }));
          }
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
          // 获取权限信息
          await get().fetchPermissions();
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

      fetchPermissions: async () => {
        try {
          const res = await adminAPI.getMyPermissions();
          if (res.code === 200) {
            console.log('✅ 获取权限成功:', res.data);
            set({
              permissions: res.data.permissions || [],
              isSuperadmin: res.data.is_superadmin || false
            });
          }
        } catch (error) {
          console.error('获取权限失败:', error);
        }
      },

      logout: () => {
        console.log('🚪 登出');
        // 清除 localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin');
        }
        set({
          admin: null,
          token: null,
          isLoggedIn: false,
          permissions: [],
          isSuperadmin: false
        });
      }
    }),
    {
      name: 'admin-storage',
      onRehydrateStorage: (state) => {
        console.log('💧 从 localStorage 恢复状态:', state);
      }
    }
  )
);
