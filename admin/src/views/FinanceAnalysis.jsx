import { useState, useEffect } from 'react';
import { adminAPI } from '../api/index';

export default function FinanceAnalysis() {
  const [overview, setOverview] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [dailyOrders, setDailyOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadDailyOrders();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, dailyRes, categoryRes, productRes, customerRes] = await Promise.all([
        adminAPI.get('/admin/finance/overview'),
        adminAPI.get('/admin/finance/daily?days=7'),
        adminAPI.get('/admin/finance/category'),
        adminAPI.get('/admin/finance/product/top?limit=10'),
        adminAPI.get('/admin/finance/customer/top?limit=10')
      ]);

      if (overviewRes.code === 200) setOverview(overviewRes.data);
      if (dailyRes.code === 200) setDailyData(dailyRes.data);
      if (categoryRes.code === 200) setCategoryData(categoryRes.data);
      if (productRes.code === 200) setTopProducts(productRes.data);
      if (customerRes.code === 200) setTopCustomers(customerRes.data);
    } catch (error) {
      console.error('加载财务数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyOrders = async () => {
    try {
      const res = await adminAPI.get(`/admin/finance/daily/orders?date=${selectedDate}`);
      if (res.code === 200) setDailyOrders(res.data);
    } catch (error) {
      console.error('加载每日订单数据失败:', error);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">加载中...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">财务分析</h1>
      
      {overview && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">总订单数</p>
              <p className="text-2xl font-bold text-blue-600">{overview.totalOrders}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">总金额</p>
              <p className="text-2xl font-bold text-green-600">¥{Number(overview.totalAmount).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">本月订单</p>
              <p className="text-2xl font-bold text-orange-600">{overview.monthOrders}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">本月金额</p>
              <p className="text-2xl font-bold text-purple-600">¥{Number(overview.monthAmount).toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">总采购成本</p>
              <p className="text-xl font-bold text-red-600">¥{Number(overview.totalCost).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">总回款金额</p>
              <p className="text-xl font-bold text-green-600">¥{Number(overview.totalActualAmount).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">总利润</p>
              <p className="text-xl font-bold text-blue-600">¥{Number(overview.totalProfit).toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">本月采购成本</p>
              <p className="text-lg font-bold text-red-600">¥{Number(overview.monthCost).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">本月回款金额</p>
              <p className="text-lg font-bold text-green-600">¥{Number(overview.monthActualAmount).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500 text-sm">本月利润</p>
              <p className="text-lg font-bold text-blue-600">¥{Number(overview.monthProfit).toFixed(2)}</p>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-4">近7日销售趋势</h2>
          <div className="space-y-2">
            {dailyData.map((day, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">{day.date}</span>
                <div className="text-right">
                  <span className="text-sm">订单: {day.orderCount}</span>
                  <span className="ml-4 text-sm">金额: ¥{Number(day.orderAmount).toFixed(2)}</span>
                  <span className="ml-4 text-sm text-green-600">利润: ¥{Number(day.profitAmount).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-4">分类销售占比</h2>
          <div className="space-y-2">
            {categoryData.map((cat, idx) => (
              <div key={idx} className="py-2 border-b">
                <div className="flex justify-between mb-1">
                  <span className="text-sm">{cat.categoryName}</span>
                  <span className="text-sm font-medium">¥{Number(cat.totalAmount).toFixed(2)} ({cat.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: cat.percentage + '%' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-4">热销商品TOP10</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">商品</th>
                <th className="py-2 text-right">销量</th>
                <th className="py-2 text-right">金额</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="py-2">{p.productName}</td>
                  <td className="py-2 text-right">{p.totalQuantity}</td>
                  <td className="py-2 text-right text-orange-600">¥{Number(p.totalAmount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-4">客户消费TOP10</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">客户</th>
                <th className="py-2 text-right">订单数</th>
                <th className="py-2 text-right">消费金额</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((c, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="py-2">
                    <div>{c.nickname || c.username}</div>
                    <div className="text-xs text-gray-400">{c.orderTitle || '-'}</div>
                  </td>
                  <td className="py-2 text-right">{c.orderCount}</td>
                  <td className="py-2 text-right text-green-600">¥{Number(c.totalAmount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">每日订单收支明细</h2>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-2">选择日期:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded px-3 py-1 text-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2">订单号</th>
                  <th className="py-2">创建时间</th>
                  <th className="py-2">客户</th>
                  <th className="py-2 text-right">订单金额</th>
                  <th className="py-2 text-right">采购成本</th>
                  <th className="py-2 text-right">运输成本</th>
                  <th className="py-2 text-right">回款金额</th>
                  <th className="py-2 text-right">利润</th>
                  <th className="py-2">状态</th>
                </tr>
              </thead>
              <tbody>
                {dailyOrders.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-4 text-center text-gray-400">
                      该日期无订单数据
                    </td>
                  </tr>
                ) : (
                  dailyOrders.map((order, idx) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">{order.orderNo}</td>
                      <td className="py-2">{new Date(order.createdAt).toLocaleString()}</td>
                      <td className="py-2">
                        <div>{order.nickname || order.username}</div>
                        <div className="text-xs text-gray-400">{order.orderTitle || '-'}</div>
                      </td>
                      <td className="py-2 text-right">¥{Number(order.total).toFixed(2)}</td>
                      <td className="py-2 text-right text-red-600">¥{Number(order.actualCost).toFixed(2)}</td>
                      <td className="py-2 text-right text-orange-600">¥{Number(order.customsFee).toFixed(2)}</td>
                      <td className="py-2 text-right text-green-600">¥{Number(order.actualAmount).toFixed(2)}</td>
                      <td className="py-2 text-right text-blue-600">¥{(Number(order.total) - Number(order.actualCost) - Number(order.customsFee)).toFixed(2)}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-1 rounded ${order.status === 'completed' ? 'bg-green-100 text-green-600' : order.status === 'shipped' ? 'bg-blue-100 text-blue-600' : order.status === 'paid' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600'}`}>
                          {order.status === 'completed' ? '已完成' : order.status === 'shipped' ? '已发货' : order.status === 'paid' ? '已支付' : order.status === 'pending' ? '待支付' : order.status === 'confirmed' ? '待配货' : order.status === 'picked' ? '已配货' : order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {dailyOrders.length > 0 && (
                <tfoot>
                  <tr className="border-t font-medium">
                    <td colSpan="3" className="py-2 text-right">合计:</td>
                    <td className="py-2 text-right">¥{dailyOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}</td>
                    <td className="py-2 text-right text-red-600">¥{dailyOrders.reduce((sum, order) => sum + order.actualCost, 0).toFixed(2)}</td>
                    <td className="py-2 text-right text-orange-600">¥{dailyOrders.reduce((sum, order) => sum + order.customsFee, 0).toFixed(2)}</td>
                    <td className="py-2 text-right text-green-600">¥{dailyOrders.reduce((sum, order) => sum + order.actualAmount, 0).toFixed(2)}</td>
                    <td className="py-2 text-right text-blue-600">¥{dailyOrders.reduce((sum, order) => sum + (Number(order.total) - Number(order.actualCost) - Number(order.customsFee)), 0).toFixed(2)}</td>
                    <td className="py-2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}