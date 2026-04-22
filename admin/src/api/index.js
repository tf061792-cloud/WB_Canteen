// API 配置 - 使用相对路径，通过 vite 代理
import { requestCache } from '../utils/requestCache';

const BASE_URL = '/api';

// 获取 token
function getToken() {
  return localStorage.getItem('admin_token') || null;
}

// 通用请求函数（带缓存）
async function request(url, options = {}, cacheOptions = {}) {
  const token = getToken();
  const { useCache = false, cacheTtl = 30000 } = cacheOptions;

  // 检查缓存
  if (useCache && (!options.method || options.method === 'GET')) {
    const cached = requestCache.get(url, options);
    if (cached) return cached;
  }

  // 判断是否是 FormData 请求（文件上传）
  const isFormData = options.body instanceof FormData;
  
  const headers = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers
    });

    const data = await response.json();
    
    if (response.ok) {
      // 缓存成功的GET请求
      if (useCache && (!options.method || options.method === 'GET')) {
        requestCache.set(url, options, data, cacheTtl);
      }
      return data;
    } else {
      throw new Error(data.message || '请求失败');
    }
  } catch (error) {
    console.error('API 请求错误:', error);
    throw error;
  }
}

// 管理员认证
const authAPI = {
  login: (data) => request('/admin/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getInfo: () => request('/admin/auth/info')
};

// 订单管理
const orderAPI = {
  list: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/orders/admin/list${query ? '?' + query : ''}`, {}, { useCache: false, cacheTtl: 0 });
  },
  update: (id, data) => request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  stats: () => request('/orders/admin/stats', {}, { useCache: true, cacheTtl: 60000 }),
  confirm: (id) => request(`/orders/${id}/confirm`, { method: 'POST' }),
  ship: (id) => request(`/orders/${id}/ship`, { method: 'POST' }),
  receive: (id) => request(`/orders/${id}/complete`, { method: 'POST' }),
  cancel: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
  updateItems: (id, data) => request(`/orders/admin/${id}/update-items`, { method: 'POST', body: JSON.stringify(data) })
};

// 商品管理
const productAPI = {
  list: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/products${query ? '?' + query : ''}`, {}, { useCache: true, cacheTtl: 60000 });
  },
  categories: () => request('/products/categories', {}, { useCache: true, cacheTtl: 300000 }),
  add: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  clearAll: () => request('/products/admin/clear-all', { method: 'DELETE' }),
  updateCost: (id, costPrice) => request(`/products/${id}/cost`, { method: 'PUT', body: JSON.stringify({ cost_price: costPrice }) }),
  // 根据ID获取单个商品
  getById: (id) => request(`/products/${id}`),
  // 分类管理
  createCategory: (data) => request('/products/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/products/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/products/categories/${id}`, { method: 'DELETE' }),
  // 图片上传
  uploadImage: (formData) => request('/admin/upload', { method: 'POST', body: formData }),
  uploadImages: (formData) => request('/admin/upload/batch', { method: 'POST', body: formData }),
  getUploadedImages: () => request('/admin/upload/list'),
  deleteUploadedImage: (filename) => request(`/admin/upload/${filename}`, { method: 'DELETE' }),
  // 根据商品名称查询商品（用于订单编辑时自动更新价格）
  searchByName: (name) => request(`/products/search/by-name?name=${encodeURIComponent(name)}`)
};

// 分类管理
const categoryAPI = {
  list: () => request('/products/categories', {}, { useCache: true, cacheTtl: 300000 }),
  add: (data) => request('/products/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/products/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/products/categories/${id}`, { method: 'DELETE' })
};

// 价格管理
const pricingAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/pricing/products${query ? '?' + query : ''}`);
  },
  update: (id, data) => request(`/admin/pricing/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  stats: () => request('/admin/pricing/stats', {}, { useCache: true, cacheTtl: 60000 })
};

// 客户管理
const customerAPI = {
  list: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/customers${query ? '?' + query : ''}`);
  },
  update: (id, data) => request(`/admin/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  review: (id, status) => request(`/admin/customers/${id}/review`, { method: 'PUT', body: JSON.stringify({ status }) })
};

// 分销管理
const distributionAPI = {
  stats: () => request('/admin/distribution/stats'),
  list: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/distribution${query ? '?' + query : ''}`);
  },
  updateCommission: (data) => request('/admin/distribution/commission', { method: 'PUT', body: JSON.stringify(data) }),
  // 提现审核
  withdrawList: () => request('/admin/distribution/withdrawals'),
  reviewWithdraw: (id, data) => request(`/admin/distribution/withdrawals/${id}/review`, { method: 'PUT', body: JSON.stringify(data) })
};

// 后台用户管理
const adminUserAPI = {
  list: () => request('/admin/users'),
  add: (data) => request('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/admin/users/${id}`, { method: 'DELETE' })
};

// 权限管理
const permissionAPI = {
  list: () => request('/admin/permissions'),
  update: (role, data) => request(`/admin/permissions/${role}`, { method: 'PUT', body: JSON.stringify(data) }),
  reset: (role) => request(`/admin/permissions/${role}/reset`, { method: 'POST' })
};

// 轮播图管理
const bannerAPI = {
  list: () => request('/banners'),
  create: (data) => request('/banners', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/banners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/banners/${id}`, { method: 'DELETE' }),
  upload: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return request('/admin/upload', {
      method: 'POST',
      body: formData,
      headers: {}
    });
  }
};

// 配货API
const pickerAPI = {
  getStats: () => request('/picker/stats'),
  getOrders: (status = 'confirmed') => request(`/picker/orders?status=${status}`),
  getOrderDetail: (id) => request(`/picker/orders/${id}`),
  submitPicking: (id, items) => request(`/picker/orders/${id}/pick`, {
    method: 'POST',
    body: JSON.stringify({ items })
  })
};

// 通用 admin API（用于新模块）
const adminAPI = {
  get: (url) => request(url),
  post: (url, data) => request(url, { method: 'POST', body: JSON.stringify(data) }),
  put: (url, data) => request(url, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (url) => request(url, { method: 'DELETE' })
};

export { 
  authAPI, 
  orderAPI, 
  productAPI, 
  categoryAPI, 
  pricingAPI,
  customerAPI,
  distributionAPI,
  adminUserAPI,
  permissionAPI,
  bannerAPI, 
  pickerAPI,
  adminAPI 
};
export default { 
  authAPI, 
  orderAPI, 
  productAPI, 
  categoryAPI, 
  pricingAPI,
  customerAPI,
  distributionAPI,
  adminUserAPI,
  permissionAPI,
  bannerAPI,
  pickerAPI,
  adminAPI 
};
