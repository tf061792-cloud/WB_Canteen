import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useUserStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    try {
      setLoading(true);
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 顶部 */}
      <div className="p-4 flex items-center">
        <Link to="/" className="text-2xl">←</Link>
      </div>

      {/* Logo */}
      <div className="flex-1 flex flex-col items-center justify-start pt-12">
        <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center text-4xl mb-4">
          🍽️
        </div>
        <h1 className="text-2xl font-bold text-gray-800">WB食堂食材</h1>
        <p className="text-gray-500 mt-1">便捷下单，新鲜直达</p>
      </div>

      {/* 登录表单 */}
      <form onSubmit={handleSubmit} className="p-6">
        <div className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium disabled:bg-gray-300"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link to="/register" className="text-orange-500 text-sm">
            还没有账号？立即注册
          </Link>
        </div>
      </form>
    </div>
  );
}
