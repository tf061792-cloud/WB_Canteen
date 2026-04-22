import { create } from 'zustand';
import { authAPI } from '../api/index';

// 清理可能残留的 localStorage 数据
localStorage.removeItem('admin-storage')

export const useAdminStore = create(
  (set, get) => ({
    admin: null,
    token: null,
    isLoggedIn: false,
    
    // 登录
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
        // 保存 token 到 localStorage 供 API 请求使用
        localStorage.setItem('admin_token', data.token);
        return true;
      }
      throw new Error(res.message);
    },
    
    // 获取管理员信息
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
    
    // 登出
    logout: () => {
      set({
        admin: null,
        token: null,
        isLoggedIn: false
      });
      // 清除 localStorage 中的 token
      localStorage.removeItem('admin_token');
    }
  })
);
