import { useState, useEffect } from 'react';
import { adminAPI } from '../api';

export default function DistributionManage() {
  const [promoters, setPromoters] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [config, setConfig] = useState({ commission_type: 'profit', commission_rate: 10 });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('applications');
  const [selectedPromoter, setSelectedPromoter] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [applicationFilter, setApplicationFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab, applicationFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'applications') {
        let url = '/admin/distribution/applications';
        if (applicationFilter) {
          url += `?status=${applicationFilter}`;
        }
        const appRes = await adminAPI.get(url);
        if (appRes.code === 200) {
          setApplications(appRes.data.list || []);
        }
      } else if (activeTab === 'promoters') {
        const promotersRes = await adminAPI.get('/admin/distribution/promoters');
        if (promotersRes.code === 200) {
          setPromoters(promotersRes.data.list || []);
        }
      } else if (activeTab === 'earnings') {
        const earningsRes = await adminAPI.get('/admin/distribution/earnings');
        if (earningsRes.code === 200) {
          setEarnings(earningsRes.data.list || []);
        }
      }

      const configRes = await adminAPI.get('/admin/distribution/commission-config');
      if (configRes.code === 200) {
        setConfig(configRes.data || { commission_type: 'profit', commission_rate: 10 });
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    }
    setLoading(false);
  };

  const updateConfig = async () => {
    try {
      const res = await adminAPI.put('/admin/distribution/commission-config', config);
      if (res.code === 200) {
        alert('提成配置更新成功');
      }
    } catch (error) {
      console.error('更新配置失败:', error);
      alert('更新失败');
    }
  };

  const settleEarning = async (id) => {
    try {
      const res = await adminAPI.post(`/admin/distribution/earnings/${id}/settle`);
      if (res.code === 200) {
        alert('结算成功');
        fetchData();
      }
    } catch (error) {
      console.error('结算失败:', error);
      alert('结算失败');
    }
  };

  const reviewApplication = async (id, status) => {
    try {
      const res = await adminAPI.put(`/admin/distribution/applications/${id}`, { status });
      if (res.code === 200) {
        alert(status === 'approved' ? '审核通过，已成为推广员' : '已拒绝申请');
        fetchData();
      } else {
        alert(res.message || '审核失败');
      }
    } catch (error) {
      console.error('审核失败:', error);
      alert('审核失败');
    }
  };

  const viewPromoterDetail = async (id) => {
    try {
      const res = await adminAPI.get(`/admin/distribution/promoters/${id}`);
      if (res.code === 200) {
        setSelectedPromoter(res.data);
        setDetailModalOpen(true);
      }
    } catch (error) {
      console.error('获取详情失败:', error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '已通过', color: 'bg-green-100 text-green-800' },
      rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-2 py-1 rounded text-sm ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">分销管理</h1>

      {/* 提成配置 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">提成配置</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">提成模式</label>
            <select
              value={config.commission_type}
              onChange={(e) => setConfig({ ...config, commission_type: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="profit">毛利润 × 百分比</option>
              <option value="sales">销售额 × 百分比</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {config.commission_type === 'profit' ? '利润提成比例' : '销售提成比例'}(%)
            </label>
            <input
              type="number"
              value={config.commission_rate}
              onChange={(e) => setConfig({ ...config, commission_rate: parseFloat(e.target.value) })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={updateConfig}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              保存配置
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {config.commission_type === 'profit'
            ? '推广员提成 = 订单毛利润 × 提成比例'
            : '推广员提成 = 订单销售额 × 提成比例'}
        </p>
      </div>

      {/* Tab切换 */}
      <div className="flex space-x-4 mb-4 border-b">
        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-2 px-4 ${activeTab === 'applications' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-600'}`}
        >
          推广员申请
        </button>
        <button
          onClick={() => setActiveTab('promoters')}
          className={`pb-2 px-4 ${activeTab === 'promoters' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-600'}`}
        >
          推广员列表
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`pb-2 px-4 ${activeTab === 'earnings' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-600'}`}
        >
          收益记录
        </button>
      </div>

      {/* 推广员申请列表 */}
      {activeTab === 'applications' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex items-center gap-4">
            <select
              value={applicationFilter}
              onChange={(e) => { setApplicationFilter(e.target.value); }}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">全部状态</option>
              <option value="pending">待审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已拒绝</option>
            </select>
            <button
              onClick={fetchData}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
            >
              刷新
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10">加载中...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">申请用户</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">申请时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{app.nickname || app.username}</div>
                      <div className="text-sm text-gray-500">{app.username}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{app.created_at}</td>
                    <td className="px-4 py-3">{getStatusBadge(app.status)}</td>
                    <td className="px-4 py-3">
                      {app.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => reviewApplication(app.id, 'approved')}
                            className="text-green-600 hover:text-green-800 text-sm"
                          >
                            通过
                          </button>
                          <button
                            onClick={() => reviewApplication(app.id, 'rejected')}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            拒绝
                          </button>
                        </div>
                      )}
                      {app.status !== 'pending' && (
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {applications.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-10 text-center text-gray-500">
                      暂无申请记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 推广员列表 */}
      {activeTab === 'promoters' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-10">加载中...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">推广员</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">客户数</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">总销售额</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">总收益</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">注册时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {promoters.map((promoter) => (
                  <tr key={promoter.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{promoter.nickname || promoter.username}</div>
                      <div className="text-sm text-gray-500">{promoter.username}</div>
                    </td>
                    <td className="px-4 py-3">{promoter.customer_count}</td>
                    <td className="px-4 py-3">¥{promoter.total_sales}</td>
                    <td className="px-4 py-3 text-red-600 font-medium">¥{promoter.total_commission}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{promoter.created_at}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => viewPromoterDetail(promoter.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 收益记录 */}
      {activeTab === 'earnings' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-10">加载中...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">订单号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">推广员</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">客户</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">订单金额</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">提成模式</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">提成比例</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">收益金额</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {earnings.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm">{item.order_no}</td>
                    <td className="px-4 py-3">{item.promoter_name}</td>
                    <td className="px-4 py-3">{item.customer_name}</td>
                    <td className="px-4 py-3">¥{item.order_amount}</td>
                    <td className="px-4 py-3">
                      {item.commission_type === 'profit' ? '利润提成' : '销售提成'}
                    </td>
                    <td className="px-4 py-3">{item.commission_rate}%</td>
                    <td className="px-4 py-3 text-red-600 font-medium">¥{item.commission_amount}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        item.status === 'settled'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status === 'settled' ? '已结算' : '待结算'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.status === 'pending' && (
                        <button
                          onClick={() => settleEarning(item.id)}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          结算
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 推广员详情弹窗 */}
      {detailModalOpen && selectedPromoter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">推广员详情</h3>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedPromoter.customer_count}</div>
                  <div className="text-sm text-gray-600">客户数</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">¥{selectedPromoter.total_sales || 0}</div>
                  <div className="text-sm text-gray-600">总销售额</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">¥{selectedPromoter.total_commission || 0}</div>
                  <div className="text-sm text-gray-600">总收益</div>
                </div>
              </div>

              <h4 className="font-medium mt-4">客户列表</h4>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">客户名称</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">订单数</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">消费金额</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">绑定时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedPromoter.customers?.map((customer) => (
                      <tr key={customer.id}>
                        <td className="px-4 py-2">{customer.nickname || customer.username}</td>
                        <td className="px-4 py-2">{customer.order_count}</td>
                        <td className="px-4 py-2">¥{customer.total_amount}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{customer.bind_time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}