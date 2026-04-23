import axios from 'axios';

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
      const token = localStorage.getItem('token');
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
      localStorage.removeItem('admin');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/api/admin/auth/login', data),
  getInfo: () => api.get('/api/admin/auth/info')
};

export const adminAPI = {
  // 通用方法（自动添加 /api 前缀）
  get: (url, params) => api.get(`/api${url}`, { params }),
  post: (url, data) => api.post(`/api${url}`, data),
  put: (url, data) => api.put(`/api${url}`, data),
  delete: (url) => api.delete(`/api${url}`),
  
  // 管理员用户管理
  getAdmins: (params) => api.get('/api/admin/users', { params }),
  createAdmin: (data) => api.post('/api/admin/users', data),
  updateAdmin: (id, data) => api.put(`/api/admin/users/${id}`, data),
  deleteAdmin: (id) => api.delete(`/api/admin/users/${id}`),
  
  // 客户管理
  getCustomers: (params) => api.get('/api/admin/customers', { params }),
  updateCustomer: (id, data) => api.put(`/api/admin/customers/${id}`, data),
  
  // 分销管理
  getDistribution: (params) => api.get('/api/admin/distribution', { params }),
  updateDistribution: (id, data) => api.put(`/api/admin/distribution/${id}`, data),
  
  // 权限管理
  getPermissions: () => api.get('/api/admin/permissions'),
  updatePermissions: (data) => api.put('/api/admin/permissions', data),
  
  // 网站信息
  getSiteInfo: () => api.get('/api/site'),
  updateSiteInfo: (data) => api.put('/api/admin/site', data)
};

export const orderAPI = {
  list: (params) => api.get('/api/orders/admin/list', { params }),
  getOrders: (params) => api.get('/api/orders/admin/list', { params }),
  getOrderStats: () => api.get('/api/orders/admin/stats'),
  stats: () => api.get('/api/orders/admin/stats'),
  updateOrder: (id, data) => api.put(`/api/orders/${id}`, data),
  confirmOrder: (id) => api.post(`/api/orders/${id}/confirm`),
  cancelOrder: (id) => api.post(`/api/orders/${id}/cancel`),
  shipOrder: (id) => api.post(`/api/orders/${id}/ship`),
  completeOrder: (id) => api.post(`/api/orders/${id}/complete`),
  updateOrderItems: (id, data) => api.post(`/api/orders/admin/${id}/update-items`),
  pickOrder: (id, data) => api.post(`/api/orders/admin/${id}/pick`)
};

export const productAPI = {
  list: (params) => api.get('/api/products', { params }),
  getProducts: (params) => api.get('/api/products', { params }),
  getProduct: (id) => api.get(`/api/products/${id}`),
  createProduct: (data) => api.post('/api/products', data),
  updateProduct: (id, data) => api.put(`/api/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/api/products/${id}`),
  update: (id, data) => api.put(`/api/products/${id}`, data), // 兼容 CategoryList 调用
  
  // 分类管理
  getCategories: () => api.get('/api/products/categories'),
  categories: () => api.get('/api/products/categories'), // 兼容 CategoryList 调用
  createCategory: (data) => api.post('/api/products/categories', data),
  updateCategory: (id, data) => api.put(`/api/products/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/api/products/categories/${id}`)
};

export const categoryAPI = productAPI;

export const pickerAPI = {
  getOrders: (params) => api.get('/api/picker/orders', { params }),
  getOrderDetail: (id) => api.get(`/api/picker/orders/${id}`),
  getProducts: () => api.get('/api/picker/products'),
  submitPickList: (orderId, data) => api.post(`/api/picker/orders/${orderId}/pick`, data)
};

export const pricingAPI = {
  list: (params) => api.get('/api/admin/pricing', { params }),
  getPricing: () => api.get('/api/admin/pricing'),
  updatePricing: (data) => api.put('/api/admin/pricing', data)
};

export const bannerAPI = {
  list: (params) => api.get('/api/banners', { params }),
  getBanners: (params) => api.get('/api/banners', { params }),
  createBanner: (data) => api.post('/api/admin/banners', data),
  updateBanner: (id, data) => api.put(`/api/admin/banners/${id}`, data),
  deleteBanner: (id) => api.delete(`/api/admin/banners/${id}`)
};

export default api;
