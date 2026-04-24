import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useUserStore } from '../stores/userStore';
import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'https://wbcanteen-production.up.railway.app';

function getToken() {
  const userStorage = JSON.parse(localStorage.getItem('user-storage') || '{}');
  const state = userStorage.state || userStorage;
  return state?.token || null;
}

const promoterAPI = {
  getInviteLink: () => {
    const token = getToken();
    return axios.get(`${API_BASE_URL}/api/promoter/invite-link`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data);
  },
  applyUpgrade: () => {
    const token = getToken();
    return axios.post(`${API_BASE_URL}/api/promoter/apply-upgrade`, {}, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data);
  },
  getUpgradeStatus: () => {
    const token = getToken();
    return axios.get(`${API_BASE_URL}/api/promoter/upgrade-status`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data);
  },
};

export default function UserCenter() {
  const { user, logout } = useUserStore();
  const navigate = useNavigate();
  const [inviteData, setInviteData] = useState(null);
  const [upgradeStatus, setUpgradeStatus] = useState([]);
  const [loading, setLoading] = useState(false);

  const userRole = user?.role || 'operator';
  const isOperator = userRole === 'operator';
  const isUser = userRole === 'user';
  const isPromoter = userRole === 'promoter';

  const roleNames = {
    promoter: { name: '推广员', color: 'bg-purple-500', desc: '可绑定客户，获得利润分成' },
    user: { name: '普通用户', color: 'bg-blue-500', desc: '可申请成为推广员' },
    operator: { name: '操作员', color: 'bg-gray-500', desc: '可下单、确认订单、打印' }
  };

  useEffect(() => {
    if (isPromoter) {
      loadInviteLink();
    } else if (isUser) {
      loadUpgradeStatus();
    }
  }, [userRole]);

  const loadInviteLink = async () => {
    try {
      const res = await promoterAPI.getInviteLink();
      if (res.code === 200) {
        setInviteData(res.data);
      }
    } catch (e) {
      console.error('加载推广链接失败:', e);
    }
  };

  const loadUpgradeStatus = async () => {
    try {
      const res = await promoterAPI.getUpgradeStatus();
      if (res.code === 200) {
        setUpgradeStatus(res.data);
      }
    } catch (e) {
      console.error('加载升级状态失败:', e);
    }
  };

  const handleApplyUpgrade = async () => {
    if (!confirm('确定要申请成为推广员吗？')) return;
    setLoading(true);
    try {
      const res = await promoterAPI.applyUpgrade();
      if (res.code === 200) {
        alert('申请已提交，等待管理员审核');
        loadUpgradeStatus();
      } else {
        alert(res.message);
      }
    } catch (e) {
      alert('申请失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteData?.invite_link) {
      navigator.clipboard.writeText(inviteData.invite_link);
      alert('邀请链接已复制到剪贴板');
    }
  };

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
      navigate('/login');
    }
  };

  const roleInfo = roleNames[userRole] || roleNames.operator;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 flex items-center justify-between sticky top-0 z-10">
        <Link to="/" className="text-2xl">←</Link>
        <h1 className="text-lg font-medium">个人中心</h1>
        <div className="w-8"></div>
      </div>

      <div className="bg-gradient-to-r from-orange-500 to-orange-400 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-orange-500">
            {user?.nickname?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </div>
          <div className="text-white flex-1">
            <h2 className="text-xl font-medium">{user?.nickname || user?.username}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${roleInfo.color} bg-opacity-80`}>
                {roleInfo.name}
              </span>
            </div>
            <p className="text-xs opacity-80 mt-1">{roleInfo.desc}</p>
          </div>
        </div>
      </div>

      {isPromoter && (
        <div className="bg-white mx-4 mt-2 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-medium text-gray-800">邀请客户</h3>
            <button
              onClick={copyInviteLink}
              className="text-xs py-1 px-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              复制链接
            </button>
          </div>

          {inviteData ? (
            <div className="text-xs">
              <div className="text-gray-500 mb-1">邀请码: <span className="text-orange-500 font-medium">{inviteData.promoter_code}</span></div>
              <div className="text-gray-600 break-all">链接: <span className="text-gray-800">{inviteData.invite_link}</span></div>
            </div>
          ) : (
            <div className="text-xs text-center py-2 text-gray-500">加载中...</div>
          )}
        </div>
      )}

      {isUser && (
        <div className="bg-white mt-3 mx-4 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-800">申请成为推广员</h3>
              <p className="text-xs text-gray-500 mt-1">绑定客户，获得订单利润分成</p>
            </div>
            {upgradeStatus.length > 0 && upgradeStatus[0].status === 'pending' ? (
              <span className="text-sm text-orange-500">审核中...</span>
            ) : (
              <button
                onClick={handleApplyUpgrade}
                disabled={loading}
                className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg disabled:opacity-50"
              >
                {loading ? '申请中...' : '立即申请'}
              </button>
            )}
          </div>
          {upgradeStatus.length > 0 && upgradeStatus[0].status === 'rejected' && (
            <p className="text-xs text-red-500 mt-2">上次申请被拒绝，可重新申请</p>
          )}
        </div>
      )}

      {isOperator && (
        <div className="bg-white mt-3 mx-4 rounded-xl p-4">
          <h3 className="font-medium text-gray-800">操作员权限</h3>
          <div className="grid grid-cols-3 gap-4 mt-3 text-center">
            <div className="p-2 bg-gray-50 rounded-lg">
              <div className="text-2xl">🛒</div>
              <div className="text-xs text-gray-600 mt-1">挑选商品</div>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <div className="text-2xl">✅</div>
              <div className="text-xs text-gray-600 mt-1">确认订单</div>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <div className="text-2xl">🖨️</div>
              <div className="text-xs text-gray-600 mt-1">打印明细</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white mt-3 mx-4 rounded-xl">
        <Link to="/order/list" className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <span className="text-gray-800">我的订单</span>
          </div>
          <span className="text-gray-400">›</span>
        </Link>
        <Link to="/cart" className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-xl">🛒</span>
            <span className="text-gray-800">购物车</span>
          </div>
          <span className="text-gray-400">›</span>
        </Link>
        <Link to="/order/export" className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-xl">📄</span>
            <span className="text-gray-800">订单导出</span>
          </div>
          <span className="text-gray-400">›</span>
        </Link>
        <Link to="/addresses" className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">📍</span>
            <span className="text-gray-800">收货地址</span>
          </div>
          <span className="text-gray-400">›</span>
        </Link>
      </div>

      <div className="bg-white mt-3 mx-4 rounded-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-xl">👤</span>
            <span className="text-gray-800">账号</span>
          </div>
          <span className="text-gray-400">{user?.username}</span>
        </div>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">📅</span>
            <span className="text-gray-800">注册时间</span>
          </div>
          <span className="text-gray-400">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
          </span>
        </div>
      </div>

      <div className="mt-6 px-4">
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-white text-red-500 rounded-lg font-medium text-center"
        >
          退出登录
        </button>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 flex">
        <Link to="/" className="flex-1 py-2 flex flex-col items-center text-gray-500">
          <span className="text-xl">🏠</span>
          <span className="text-xs mt-1">首页</span>
        </Link>
        <Link to="/cart" className="flex-1 py-2 flex flex-col items-center text-gray-500">
          <span className="text-xl">🛒</span>
          <span className="text-xs mt-1">购物车</span>
        </Link>
        <Link to="/order/list" className="flex-1 py-2 flex flex-col items-center text-gray-500">
          <span className="text-xl">📋</span>
          <span className="text-xs mt-1">订单</span>
        </Link>
        <Link to="/user" className="flex-1 py-2 flex flex-col items-center text-orange-500">
          <span className="text-xl">👤</span>
          <span className="text-xs mt-1">我的</span>
        </Link>
      </div>
    </div>
  );
}