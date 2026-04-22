import { useState, useEffect } from 'react';
import { adminAPI } from '../api/index';

// 角色映射
const ROLE_MAP = {
  promoter: { label: '推广员', color: 'bg-purple-100 text-purple-800' },
  user: { label: '普通用户', color: 'bg-green-100 text-green-800' },
  operator: { label: '操作员', color: 'bg-blue-100 text-blue-800' },
  distributor: { label: '分销员', color: 'bg-purple-100 text-purple-800' }
};

function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [promoters, setPromoters] = useState([]);
  const pageSize = 10;

  useEffect(() => {
    fetchCustomers();
    fetchPromoters();
  }, [page, keyword]);

  const fetchPromoters = async () => {
    try {
      const res = await adminAPI.get('/admin/distribution/promoters?page=1&pageSize=100');
      if (res.code === 200) {
        setPromoters(res.data.list || []);
      }
    } catch (error) {
      console.error('获取推广员列表失败:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.get(`/admin/customers?page=${page}&pageSize=${pageSize}&keyword=${keyword}`);
      if (res.code === 200) {
        setCustomers(res.data.list);
        setTotal(res.data.total);
      }
    } catch (error) {
      console.error('获取客户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setEditForm({
      nickname: customer.nickname || '',
      role: customer.role || 'user',
      parent_id: customer.parent_id || '',
      order_title: customer.order_title || ''
    });
  };

  const handleSave = async () => {
    try {
      const res = await adminAPI.put(`/admin/customers/${editingCustomer.id}`, editForm);
      if (res.code === 200) {
        alert('更新成功');
        setEditingCustomer(null);
        fetchCustomers();
      } else {
        alert(res.message || '更新失败');
      }
    } catch (error) {
      console.error('更新客户失败:', error);
      alert('更新失败');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除该客户吗？')) return;
    try {
      const res = await adminAPI.delete(`/admin/customers/${id}`);
      if (res.code === 200) {
        alert('删除成功');
        fetchCustomers();
      }
    } catch (error) {
      console.error('删除客户失败:', error);
      alert('删除失败');
    }
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
        <h1 className="text-2xl font-bold text-gray-800">客户管理</h1>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="搜索用户名/昵称"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={fetchCustomers}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            刷新
          </button>
        </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">所属推广员</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单抬头</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">消费金额</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">注册时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{customer.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{customer.username}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{customer.nickname || '-'}</td>
                    <td className="px-6 py-4">{getRoleBadge(customer.role)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {customer.promoter_name ? (
                        <span className="text-green-600 font-medium">{customer.promoter_name}</span>
                      ) : (
                        <span className="text-gray-400">无</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{customer.order_title || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{customer.order_count || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">¥{Number(customer.total_amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(customer.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleEdit(customer)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id)}
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

      {/* 编辑弹窗 */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">编辑客户信息</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  type="text"
                  value={editingCustomer.username}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
                <input
                  type="text"
                  value={editForm.nickname}
                  onChange={(e) => setEditForm({...editForm, nickname: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="promoter">推广员</option>
                  <option value="user">普通用户</option>
                  <option value="operator">操作员</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属推广员</label>
                <select
                  value={editForm.parent_id || ''}
                  onChange={(e) => setEditForm({...editForm, parent_id: e.target.value ? parseInt(e.target.value) : null})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">无</option>
                  {promoters.map(promoter => (
                    <option key={promoter.id} value={promoter.id}>
                      {promoter.nickname || promoter.username} (ID:{promoter.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">订单抬头</label>
                <input
                  type="text"
                  value={editForm.order_title}
                  onChange={(e) => setEditForm({...editForm, order_title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="请输入订单抬头"
                />
              </div>

            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingCustomer(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerList;
