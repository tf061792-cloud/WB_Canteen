import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api';

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'https://wbcanteen-production.up.railway.app';

// 通用请求函数
async function request(url, options = {}) {
  const userStorage = JSON.parse(localStorage.getItem('user-storage') || '{}');
  const state = userStorage.state || userStorage;
  const token = state?.token || null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API 请求错误:', error);
    throw error;
  }
}

const promoterAPI = {
  getCustomers: () => request('/api/promoter/customers'),
  getStatistics: () => request('/api/promoter/statistics'),
  getMyInfo: () => authAPI.getInfo()
};

export default function CustomerManage() {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // list, stats
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customersRes, statsRes, userRes] = await Promise.all([
        promoterAPI.getCustomers(),
        promoterAPI.getStatistics(),
        promoterAPI.getMyInfo()
      ]);
      if (customersRes.code === 200) setCustomers(customersRes.data);
      if (statsRes.code === 200) setStats(statsRes.data);
      if (userRes.code === 200) setUserInfo(userRes.data);
    } catch (e) {
      console.error('加载数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  // 生成邀请链接
  const getInviteLink = () => {
    if (!userInfo?.promoter_code) return '';
    const baseUrl = 'https://wbcanteen-client.vercel.app';
    return `${baseUrl}/register?code=${userInfo.promoter_code}`;
  };

  // 复制链接
  const copyInviteLink = async () => {
    const link = getInviteLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* 顶部 */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white p-4">
        <div className="flex items-center justify-between mb-4">
          <Link to="/user" className="text-2xl">←</Link>
          <h1 className="text-lg font-medium">我的客户与收益</h1>
          <div className="w-8"></div>
        </div>
        
        {/* 累计收益 */}
        {stats && (
          <div className="text-center py-4">
            <div className="text-3xl font-bold">฿{stats.total_commission?.toFixed(2) || '0.00'}</div>
            <div className="text-xs opacity-80 mt-1">累计收益</div>
          </div>
        )}
      </div>

      {/* Tab切换 */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          <button 
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-3 text-center text-sm font-medium ${activeTab === 'list' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}
          >
            客户列表
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-3 text-center text-sm font-medium ${activeTab === 'stats' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}
          >
            收益统计
          </button>
        </div>
      </div>

      {/* 客户列表 */}
      {activeTab === 'list' && (
        <div className="p-4">
          {/* 邀请链接卡片 */}
          {userInfo && (
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-4 mb-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">📢 邀请好友赚收益</span>
                {copySuccess && <span className="text-xs bg-green-500 px-2 py-0.5 rounded">已复制!</span>}
              </div>
              <div className="bg-white/20 rounded p-2 mb-3">
                <div className="text-xs opacity-80 mb-1">您的专属邀请链接:</div>
                <div className="text-xs break-all">{getInviteLink()}</div>
              </div>
              <button 
                onClick={copyInviteLink}
                className="w-full bg-white text-purple-600 py-2 rounded-lg text-sm font-medium active:scale-95 transition"
              >
                复制邀请链接
              </button>
              <div className="text-xs text-center mt-2 opacity-80">
                邀请码: {userInfo.promoter_code}
              </div>
            </div>
          )}

          {/* 统计卡片 */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.customer_count || 0}</div>
                <div className="text-xs text-gray-500 mt-1">绑定客户</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-500">{stats.total_orders || 0}</div>
                <div className="text-xs text-gray-500 mt-1">客户订单</div>
              </div>
            </div>
          )}



          {/* 客户列表 */}
          <h2 className="text-sm font-medium text-gray-500 mb-3">客户列表</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-400">加载中...</div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-gray-400 bg-white rounded-lg">
              <div className="text-4xl mb-2">👥</div>
              <p>暂无绑定客户</p>
              <p className="text-xs mt-1">分享邀请码给客户注册</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customers.map(customer => (
                <div key={customer.id} className="bg-white rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-500 font-bold">
                        {customer.nickname?.charAt(0) || customer.username?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="font-medium">{customer.nickname || customer.username}</div>
                        <div className="text-xs text-gray-400">{customer.username}</div>
                      </div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${customer.role === 'user' ? 'bg-blue-100 text-blue-600' : customer.role === 'operator' ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-600'}`}>
                      {customer.role === 'user' ? '普通用户' : customer.role === 'operator' ? '操作员' : '推广员'}
                    </div>
                  </div>
                  
                  {/* 绑定关系信息 */}
                  <div className="bg-gray-50 rounded p-3 mb-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">绑定时间:</span>
                        <span className="text-gray-700 ml-1">{new Date(customer.bind_time).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">累计订单:</span>
                        <span className="text-purple-600 ml-1 font-medium">{customer.order_count || 0}单</span>
                      </div>
                      <div>
                        <span className="text-gray-400">累计消费:</span>
                        <span className="text-orange-600 ml-1">฿{customer.total_amount?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">我的收益:</span>
                        <span className="text-red-500 ml-1 font-medium">฿{customer.total_commission?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-400">
                    最近下单: {customer.last_order_at ? new Date(customer.last_order_at).toLocaleDateString() : '暂无'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 收益统计 */}
      {activeTab === 'stats' && (
        <div className="p-4">
          {stats ? (
            <>
              {/* 收益明细 */}
              <div className="bg-white rounded-lg p-4 mb-4">
                <h3 className="font-medium mb-3">收益明细</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">今日收益</span>
                    <span className="font-medium text-red-500">+฿{stats.today_commission?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">本周收益</span>
                    <span className="font-medium">฿{stats.week_commission?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">本月收益</span>
                    <span className="font-medium">฿{stats.month_commission?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-medium">累计收益</span>
                    <span className="font-bold text-red-500">฿{stats.total_commission?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>

              {/* 订单统计 */}
              <div className="bg-white rounded-lg p-4 mb-4">
                <h3 className="font-medium mb-3">订单统计</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-xl font-bold text-purple-600">{stats.today_orders || 0}</div>
                    <div className="text-xs text-gray-500">今日订单</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-xl font-bold text-orange-600">{stats.total_orders || 0}</div>
                    <div className="text-xs text-gray-500">累计订单</div>
                  </div>
                </div>
              </div>

              {/* 客户增长 */}
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-medium mb-3">客户增长</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">客户总数</span>
                    <span className="font-medium">{stats.customer_count || 0}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">暂无统计数据</div>
          )}
        </div>
      )}
    </div>
  );
}
