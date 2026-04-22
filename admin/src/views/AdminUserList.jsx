import { useState, useEffect } from 'react';
import { adminAPI } from '../api/index';

// 角色映射
const ROLE_MAP = {
  superadmin: { label: '超级管理员', color: 'bg-red-100 text-red-800' },
  admin: { label: '管理员', color: 'bg-red-100 text-red-800' },
  operation: { label: '运营', color: 'bg-blue-100 text-blue-800' },
  finance: { label: '财务', color: 'bg-yellow-100 text-yellow-800' },
  operator: { label: '操作员', color: 'bg-green-100 text-green-800' },
  picker: { label: '配货员', color: 'bg-purple-100 text-purple-800' },
  channel: { label: '渠道', color: 'bg-gray-100 text-gray-800' }
};

const ROLE_OPTIONS = [
  { value: 'superadmin', label: '超级管理员' },
  { value: 'operation', label: '运营' },
  { value: 'finance', label: '财务' },
  { value: 'operator', label: '操作员' },
  { value: 'picker', label: '配货员' }
];

function AdminUserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nickname: '',
    role: 'operator'
  });
  const pageSize = 10;

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.get(`/admin/users?page=${page}&pageSize=${pageSize}`);
      if (res.code === 200) {
        setUsers(res.data.list);
        setTotal(res.data.total);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await adminAPI.put(`/admin/users/${editingUser.id}`, formData);
        alert('更新成功');
      } else {
        await adminAPI.post('/admin/users', formData);
        alert('创建成功');
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ username: '', password: '', nickname: '', role: 'operator' });
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除该用户吗？')) return;
    try {
      await adminAPI.delete(`/admin/users/${id}`);
      alert('删除成功');
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || '删除失败');
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      nickname: user.nickname || '',
      role: user.role || 'operator'
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ username: '', password: '', nickname: '', role: 'operator' });
    setShowModal(true);
  };

  const getRoleBadge = (role) => {
    const roleInfo = ROLE_MAP[role] || { label: role, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${roleInfo.color}`}>
        {roleInfo.label}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">后台用户管理</h1>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 新增用户
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">加载中...</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">昵称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{user.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{user.username}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{user.nickname || '-'}</td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.status === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status === 1 ? '正常' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(user.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              共 {total} 条记录，第 {page} 页
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= total}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
          </div>
        </>
      )}

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">
              {editingUser ? '编辑用户' : '新增用户'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  disabled={!!editingUser}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密码 {editingUser && '(留空不修改)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={!editingUser}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUserList;
