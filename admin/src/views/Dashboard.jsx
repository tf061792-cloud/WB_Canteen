import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { orderAPI } from '../api/index';

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await orderAPI.getOrderStats();
      if (res.code === 200) {
        setStats(res.data);
      }
    } catch (error) {
      console.error(t('common.error.loadStats'), error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: t('dashboard.totalOrders'), value: stats?.total_orders || 0, icon: '📋', color: 'bg-blue-500' },
    { label: t('dashboard.todayOrders'), value: stats?.today_orders || 0, icon: '📅', color: 'bg-green-500' },
    { label: t('dashboard.monthOrders'), value: stats?.month_orders || 0, icon: '📆', color: 'bg-purple-500' },
    { label: t('dashboard.todaySales'), value: `¥${(stats?.today_sales || 0).toFixed(2)}`, icon: '💰', color: 'bg-orange-500' }
  ];

  const orderStats = [
    { label: t('order.status.confirmed'), value: (stats?.status_breakdown?.confirmed || 0) + (stats?.status_breakdown?.pending || 0), color: 'bg-blue-500' },
    { label: t('order.status.picked'), value: stats?.status_breakdown?.picked || 0, color: 'bg-purple-500' },
    { label: t('order.status.shipped'), value: stats?.status_breakdown?.shipped || 0, color: 'bg-orange-500' },
    { label: t('order.status.completed'), value: stats?.status_breakdown?.completed || 0, color: 'bg-green-500' }
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('menu.dashboard')}</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-2xl mr-4`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-gray-500 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 利润统计 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-r from-green-500 to-green-400 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="opacity-80 text-sm">{t('dashboard.totalProfit')}</p>
              <p className="text-3xl font-bold mt-1">
                ¥{Number(stats?.total_profit || 0).toFixed(2)}
              </p>
              <p className="text-sm opacity-80 mt-1">
                {t('dashboard.profitOrders')} {stats?.profit_order_count || 0} {t('common.unit.order')}
              </p>
            </div>
            <div className="text-5xl opacity-50">💵</div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="opacity-80 text-sm">{t('dashboard.monthSales')}</p>
              <p className="text-3xl font-bold mt-1">
                ¥{Number(stats?.month_sales || 0).toFixed(2)}
              </p>
              <p className="text-sm opacity-80 mt-1">
                {t('common.total')} {stats?.month_orders || 0} {t('common.unit.order')}
              </p>
            </div>
            <div className="text-5xl opacity-50">📈</div>
          </div>
        </div>
      </div>

      {/* 订单状态分布 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{t('dashboard.orderStatus')}</h2>
        <div className="grid grid-cols-4 gap-4">
          {orderStats.map((item, index) => (
            <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`w-4 h-4 ${item.color} rounded-full mx-auto mb-2`}></div>
              <p className="text-gray-500 text-sm">{item.label}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="bg-white rounded-xl p-6 shadow-sm mt-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{t('dashboard.quickActions')}</h2>
        <div className="flex gap-4">
          <Link
            to="/orders"
            className="flex-1 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <span className="text-2xl mr-2">📋</span>
            <span className="text-blue-600 font-medium">{t('dashboard.viewAllOrders')}</span>
          </Link>
          <Link
            to="/products"
            className="flex-1 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <span className="text-2xl mr-2">📦</span>
            <span className="text-green-600 font-medium">{t('dashboard.manageProducts')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
