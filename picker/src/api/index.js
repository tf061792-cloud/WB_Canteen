import axios from 'axios';
import { usePickerStore } from './../stores/pickerStore';

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'https://wbcanteen-production.up.railway.app';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  config => {
    if (typeof window !== 'undefined') {
      try {
        // 直接从 store 中获取 token，而不是从 localStorage
        const { token } = usePickerStore.getState();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('获取 token 失败:', error);
      }
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  response => {
    return response.data;
  },
  error => {
    if (typeof window !== 'undefined' && error.response && error.response.status === 401) {
      // 使用 store 的 logout 方法来清除 token
      try {
        const { logout } = usePickerStore.getState();
        if (logout) {
          logout();
        }
      } catch (error) {
        console.error('登出失败:', error);
        // 后备方案：直接清除 localStorage
        localStorage.removeItem('picker-storage');
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const pickerAPI = {
  // 登录
  login: (data) => api.post('/api/picker/auth/login', data),
  
  // 获取订单列表
  getOrders: (params) => api.get('/api/picker/orders', { params }),
  
  // 获取订单详情
  getOrderDetail: (id) => api.get(`/api/picker/orders/${id}`),
  
  // 获取商品列表
  getProducts: () => api.get('/api/picker/products'),
  
  // 提交配货列表
  submitPickList: (orderId, data) => api.post(`/api/picker/orders/${orderId}/pick`, data)
};

export default api;
