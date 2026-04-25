import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../stores/adminStore';

export default function Login() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoggedIn } = useAdminStore();
  const navigate = useNavigate();
  
  // 只加日志
  console.log('🔐 Login 页面加载 - isLoggedIn:', isLoggedIn);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError(t('common.loading')); // 临时占位
      return;
    }

    try {
      setLoading(true);
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message || t('common.error.loadStats'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-400 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
            🍽️
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{t('common.appName')}</h1>
          <p className="text-gray-500 mt-1">食材下单系统</p>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">用户名</label>
            <input
              type="text"
              placeholder="请输入管理员用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">密码</label>
            <input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center py-2 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:bg-gray-300"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>


      </div>
    </div>
  );
}
