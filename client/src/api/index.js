// API 配置 - 使用相对路径，通过 vite 代理
const BASE_URL = '/api';

// 获取 token
function getToken() {
  // 尝试从 zustand persist 的 storage 中获取
  const userStorage = JSON.parse(localStorage.getItem('user-storage') || '{}');
  const state = userStorage.state || userStorage;
  return state?.token || null;
}

// 通用请求函数
async function request(url, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
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
      return data;
    } else {
      throw new Error(data.message || '请求失败');
    }
  } catch (error) {
    console.error('API 请求错误:', error);
    throw error;
  }
}

// 认证相关
const authAPI = {
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getInfo: () => request('/auth/info'),
  update: (data) => request('/auth/update', { method: 'PUT', body: JSON.stringify(data) })
};

// 商品相关
const productAPI = {
  list: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/products${query ? '?' + query : ''}`);
  },
  categories: () => request('/products/categories'),
  detail: (id) => request(`/products/${id}`)
};

// 订单相关
const orderAPI = {
  create: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  list: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/orders${query ? '?' : ''}`);
  },
  detail: (id) => request(`/orders/${id}`),
  cancel: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
  receive: (id) => request(`/orders/${id}/receive`, { method: 'POST' }),
  confirm: (id) => request(`/orders/${id}/confirm`, { method: 'POST' })
};

// 轮播图
const bannerAPI = {
  list: () => request('/banners')
};

// 收货地址
const addressAPI = {
  list: () => request('/addresses'),
  create: (data) => request('/addresses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/addresses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/addresses/${id}`, { method: 'DELETE' }),
  setDefault: (id) => request(`/addresses/${id}/default`, { method: 'POST' })
};

export { authAPI, productAPI, orderAPI, bannerAPI, addressAPI };
export default { authAPI, productAPI, orderAPI, bannerAPI, addressAPI };
