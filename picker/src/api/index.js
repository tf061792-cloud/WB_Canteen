import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('picker_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('picker_token')
      localStorage.removeItem('picker_user')
      window.location.href = '/picker/login'
    }
    return Promise.reject(error)
  }
)

export const pickerAPI = {
  // 登录
  login: (data) => request.post('/picker/auth/login', data),
  
  // 获取个人信息
  getProfile: () => request.get('/picker/auth/profile'),
  
  // 获取待配货订单列表
  getOrders: (params) => request.get('/picker/orders', { params }),
  
  // 获取订单详情
  getOrderDetail: (id) => request.get(`/picker/orders/${id}`),
  
  // 提交配货单
  submitPickList: (id, data) => request.post(`/picker/orders/${id}/pick`, data),
  
  // 获取配货历史
  getPickHistory: (params) => request.get('/picker/history', { params }),
  
  // 获取商品列表（用于选择替换商品）
  getProducts: () => request.get('/products', { params: { status: 'active' } })
}

export default request
