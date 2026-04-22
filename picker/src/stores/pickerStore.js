import { create } from 'zustand'

// 清理可能残留的 localStorage 数据
localStorage.removeItem('picker-storage')
localStorage.removeItem('picker_token')
localStorage.removeItem('picker_user')

export const usePickerStore = create(
  (set, get) => ({
    // 用户信息
    user: null,
    token: null,
    
    // 登录
    login: (user, token) => {
      localStorage.setItem('picker_token', token)
      localStorage.setItem('picker_user', JSON.stringify(user))
      set({ user, token })
    },
    
    // 登出
    logout: () => {
      localStorage.removeItem('picker_token')
      localStorage.removeItem('picker_user')
      set({ user: null, token: null })
    },
    
    // 设置用户信息
    setUser: (user) => set({ user }),
    
    // 是否已登录
    isLoggedIn: () => !!get().token
  })
)
