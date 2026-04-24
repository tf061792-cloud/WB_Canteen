import { create } from 'zustand';
import { authAPI } from '../api/index';

console.log('🏪 useAdminStore 初始化 (无 persist)');

// 从 localStorage 恢复状态
const getInitialState = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    const adminStr = localStorage.getItem('admin');
    const admin = adminStr ? JSON.parse(adminStr) : null;
    return {
      admin,
      token,
      isLoggedIn: !!token
    };
  }
  return {
    admin: null,
    token: null,
    isLoggedIn: false
  };
};

export const useAdminStore = create((set, get) => ({
  ...getInitialState(),

  login: async (username, password) => {
    console.log('🔐 尝试登录:', username);
    const res = await authAPI.login({ username, password });
    if (res.code === 200) {
      const { data } = res;
      console.log('✅ 登录成功:', data);
      
      // 保存到 localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.token);
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
    console.log('🚪 登出');
    
    // 清除 localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
    }
    
    set({
      admin: null,
      token: null,
      isLoggedIn: false
    });
  }
}));
