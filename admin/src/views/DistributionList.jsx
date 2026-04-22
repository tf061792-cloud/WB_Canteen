import { useState, useEffect } from 'react';
import { adminAPI } from '../api/index';

function DistributionList() {
  const [distributors, setDistributors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const pageSize = 10;

  useEffect(() => {
    fetchDistributors();
    fetchStats();
  }, [page, keyword]);

  const fetchDistributors = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.get(`/admin/distribution/distributors?page=${page}&pageSize=${pageSize}&keyword=${keyword}`);
      if (res.data.code === 200) {
        setDistributors(res.data.data.list);
        setTotal(res.data.data.total);
      }
    } catch (error) {
      console.error('获取分销员列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await adminAPI.get('/admin/distribution/stats');
      if (res.data.code === 200) {
        setStats(res.data.data);
      }
    } catch (error) {
      console.error('获取分销统计失败:', error);
    }
  };

  const handleCancelDistributor = async (id) => {
    if (!confirm('确定取消该分销员资格吗？')) return;
    try {
      await adminAPI.post(`/admin/distribution/cancel-distributor/${id}`);
      alert('取消成功');
      fetchDistributors();
    } catch (error) {
      alert('操作失败');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">分销管理</h1>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="搜索用户名/昵称"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">分销员总数</p>
            <p className="text-2xl font-bold text-blue-600">{stats.distributor_count}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">本月订单</p>
            <p className="text-2xl font-bold text-green-600">{stats.month_stats?.order_count || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">本月销售额</p>
            <p className="text-2xl font-bold text-orange-600">¥{(stats.month_stats?.total_sales || 0).toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">本月利润</p>
            <p className="text-2xl font-bold text-purple-600">¥{(stats.month_stats?.total_profit || 0).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* 业绩排行 */}
      {stats?.top_distributors && stats.top_distributors.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-lg font-bold mb-4">分销业绩排行 (Top 5)</h3>
          <div className="grid grid-cols-5 gap-4">
            {stats.top_distributors.slice(0, 5).map((item, index) => (
              <div key={item.id} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>
                <p className="font-medium text-gray-800">{item.nickname || item.username}</p>
                <p className="text-sm text-gray-500">¥{item.total_amount?.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">销售总额</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">累计利润</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">注册时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {distributors.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{item.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.username}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.nickname || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.order_count || 0}</td>
                    <td className="px-6 py-4 text-sm text-green-600 font-medium">¥{(item.total_amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-purple-600 font-medium">¥{(item.total_profit || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.created_at}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleCancelDistributor(item.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        取消资格
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
    </div>
  );
}

export default DistributionList;
