import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'https://wbcanteen-production.up.railway.app';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

function getToken() {
  try {
    const userStorage = JSON.parse(localStorage.getItem('user-storage') || '{}');
    const state = userStorage.state || userStorage;
    return state?.token || null;
  } catch {
    return localStorage.getItem('token');
  }
}

api.interceptors.request.use(
  config => {
    if (typeof window !== 'undefined') {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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
      localStorage.removeItem('token');
      localStorage.removeItem('user-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/api/auth/login', data),
  register: (data) => api.post('/api/auth/register', data),
  getInfo: () => api.get('/api/auth/info'),
  update: (data) => api.put('/api/auth/update')
};

export const productAPI = {
  getProducts: (params) => api.get('/api/products', { params }),
  getProduct: (id) => api.get(`/api/products/${id}`),
  getCategories: () => api.get('/api/products/categories')
};

export const bannerAPI = {
  getBanners: (params) => api.get('/api/banners', { params })
};

export const orderAPI = {
  createOrder: (data) => api.post('/api/orders', data),
  getOrders: (params) => api.get('/api/orders', { params }),
  getOrderDetail: (id) => api.get(`/api/orders/${id}`),
  confirmOrder: (id) => api.post(`/api/orders/${id}/confirm`),
  cancelOrder: (id) => api.post(`/api/orders/${id}/cancel`),
  receiveOrder: (id) => api.post(`/api/orders/${id}/receive`)
};

export const addressAPI = {
  getAddresses: () => api.get('/api/addresses'),
  createAddress: (data) => api.post('/api/addresses', data),
  updateAddress: (id, data) => api.put(`/api/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/api/addresses/${id}`),
  setDefault: (id) => api.put(`/api/addresses/${id}/default`)
};

export default api;