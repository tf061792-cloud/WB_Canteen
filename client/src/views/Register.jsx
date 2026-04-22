import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [promoterCode, setPromoterCode] = useState('');
  const { register } = useUserStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setPromoterCode(code);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }

    if (username.length < 3 || username.length > 20) {
      setError('用户名长度需要3-20位');
      return;
    }

    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }

    try {
      setLoading(true);
      await register(username, password, nickname || username, promoterCode);
      navigate('/');
    } catch (err) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-4 flex items-center">
        <Link to="/login" className="text-2xl">←</Link>
      </div>

      <div className="px-6 pt-8">
        <h1 className="text-2xl font-bold text-gray-800">注册账号</h1>
      </div>

      {promoterCode && (
        <div className="mx-6 mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="text-sm text-green-700">
            邀请码：<span className="font-bold">{promoterCode}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 flex-1">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">用户名</label>
            <input
              type="text"
              placeholder="3-20位字母或数字"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">昵称（选填）</label>
            <input
              type="text"
              placeholder="您希望我们怎么称呼您"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">密码</label>
            <input
              type="password"
              placeholder="至少6位"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">确认密码</label>
            <input
              type="password"
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium disabled:bg-gray-300 mt-4"
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-orange-500 text-sm">
            已有账号？立即登录
          </Link>
        </div>
      </form>
    </div>
  );
}