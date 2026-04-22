import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { orderAPI } from '../api/index';
import { useUserStore } from '../stores/userStore';

// 缺省图片 SVG
const PLACEHOLDER_SVG = '<svg width="56" height="56" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f5f5f5"/><text x="50%" y="50%" font-family="Arial" font-size="10" text-anchor="middle" dominant-baseline="middle" fill="#999">暂无</text></svg>';
const getPlaceholderSrc = () => 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(PLACEHOLDER_SVG)));

// 货到付款状态映射
const STATUS_MAP = {
  confirmed: { label: '已确认', color: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
  shipped: { label: '已发货', color: 'bg-purple-500', text: 'text-purple-600', bg: 'bg-purple-50' },
  completed: { label: '已完成', color: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50' },
  cancelled: { label: '已取消', color: 'bg-gray-500', text: 'text-gray-500', bg: 'bg-gray-50' }
};

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const navigate = useNavigate();
  const { user } = useUserStore();

  useEffect(() => {
    loadOrders();
  }, [status]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await orderAPI.list({ status });
      if (res.code === 200) {
        setOrders(res.data.list);
      }
    } catch (error) {
      console.error('加载订单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 取消订单
  const handleCancelOrder = async (orderId) => {
    if (!confirm('确定要取消该订单吗？')) return;
    try {
      setActionLoading(orderId + '_cancel');
      const res = await orderAPI.cancel(orderId);
      if (res.code === 200) {
        alert('订单已取消');
        loadOrders();
      } else {
        alert(res.message || '取消失败');
      }
    } catch (error) {
      alert('取消订单失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 确认收货
  const handleReceiveOrder = async (orderId) => {
    if (!confirm('确认已收到商品吗？')) return;
    try {
      setActionLoading(orderId + '_receive');
      const res = await orderAPI.receive(orderId);
      if (res.code === 200) {
        alert('订单已完成');
        loadOrders();
      } else {
        alert(res.message || '确认收货失败');
      }
    } catch (error) {
      alert('确认收货失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 获取操作按钮
  const getActionButtons = (order) => {
    const { status, id } = order;
    
    // 已确认状态
    if (status === 'confirmed') {
      return (
        <div className="text-sm text-blue-600">
          <span className="inline-flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
            等待发货
          </span>
        </div>
      );
    }
    
    // 已发货状态
    if (status === 'shipped') {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); handleReceiveOrder(id); }}
          disabled={actionLoading === id + '_receive'}
          className="px-4 py-2 bg-green-500 text-white text-sm rounded-full hover:bg-green-600 disabled:opacity-50"
        >
          {actionLoading === id + '_receive' ? '处理中...' : '确认收货'}
        </button>
      );
    }
    
    // 已完成状态
    if (status === 'completed') {
      return (
        <Link
          to={`/order/export/${id}`}
          onClick={(e) => e.stopPropagation()}
          className="px-4 py-2 border border-green-500 text-green-600 text-sm rounded-full hover:bg-green-50"
        >
          导出订单
        </Link>
      );
    }
    
    // 已取消状态
    if (status === 'cancelled') {
      return (
        <span className="text-sm text-gray-500">订单已取消</span>
      );
    }
    
    return null;
  };

  const tabs = [
    { value: '', label: '全部' },
    { value: 'confirmed', label: '已确认' },
    { value: 'shipped', label: '已发货' },
    { value: 'completed', label: '已完成' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* 顶部 */}
      <div className="bg-white p-4 flex items-center justify-between sticky top-0 z-10">
        <Link to="/" className="text-2xl">←</Link>
        <h1 className="text-lg font-medium">我的订单</h1>
        <div className="w-8"></div>
      </div>

      {/* 状态筛选 */}
      <div className="bg-white flex overflow-x-auto hide-scrollbar border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
              status === tab.value
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 订单列表 */}
      <div className="p-3 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-gray-400">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-500">暂无订单</p>
            <Link to="/" className="text-orange-500 text-sm mt-2 inline-block">
              去下单
            </Link>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="bg-white rounded-lg overflow-hidden shadow-sm">
              {/* 订单头部 */}
              <div className="p-3 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">订单号：{order.order_no}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_MAP[order.status]?.bg} ${STATUS_MAP[order.status]?.text}`}>
                  {STATUS_MAP[order.status]?.label || order.status}
                </span>
              </div>
              
              {/* 商品列表 */}
              <Link to={`/order/detail/${order.id}`} className="block p-3">
                {order.items?.slice(0, 3).map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2">
                    <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.image || getPlaceholderSrc()}
                        alt={item.product_name}
                        className="w-14 h-14 object-cover"
                        onError={(e) => {
                          e.target.src = getPlaceholderSrc();
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate font-medium">{item.product_name}</p>
                      <p className="text-xs text-gray-400 mt-1">{item.specs} · x{item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">฿{Number(item.price).toFixed(2)}</p>
                      <p className="text-xs text-gray-400">小计：฿{Number(item.subtotal).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                {order.items?.length > 3 && (
                  <p className="text-xs text-gray-400 mt-2 text-center py-2">
                    还有{order.items.length - 3}件商品...
                  </p>
                )}
              </Link>

              {/* 订单底部：金额 + 操作按钮 */}
              <div className="px-3 py-3 bg-gray-50 border-t border-gray-100">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleString()}
                  </span>
                  <span className="text-sm">
                    共{order.items?.length || 0}件，合计：
                    <span className="text-orange-500 font-bold text-lg">฿{Number(order.total).toFixed(2)}</span>
                  </span>
                </div>
                
                {/* 操作按钮 */}
                <div className="flex justify-end">
                  {getActionButtons(order)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 底部导航 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 flex z-50">
        <Link to="/" className="flex-1 py-2 flex flex-col items-center text-gray-500">
          <span className="text-xl">🏠</span>
          <span className="text-xs mt-1">首页</span>
        </Link>
        <Link to="/cart" className="flex-1 py-2 flex flex-col items-center text-gray-500">
          <span className="text-xl">🛒</span>
          <span className="text-xs mt-1">购物车</span>
        </Link>
        <Link to="/order/list" className="flex-1 py-2 flex flex-col items-center text-orange-500">
          <span className="text-xl">📋</span>
          <span className="text-xs mt-1">订单</span>
        </Link>
        <Link to="/user" className="flex-1 py-2 flex flex-col items-center text-gray-500">
          <span className="text-xl">👤</span>
          <span className="text-xs mt-1">我的</span>
        </Link>
      </div>
    </div>
  );
}