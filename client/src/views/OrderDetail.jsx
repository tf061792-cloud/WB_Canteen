import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { orderAPI } from '../api/index';

// 缺省图片 SVG
const PLACEHOLDER_SVG = '<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f5f5f5"/><text x="50%" y="50%" font-family="Arial" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="#999">暂无</text></svg>';
const getPlaceholderSrc = () => 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(PLACEHOLDER_SVG)));

// 货到付款状态映射
const STATUS_MAP = {
  pending: { label: '待确认', color: 'text-orange-600', bg: 'bg-orange-50', desc: '请确认订单，确认后将进入配货流程' },
  confirmed: { label: '已确认', color: 'text-blue-600', bg: 'bg-blue-50', desc: '订单已确认，等待发货' },
  shipped: { label: '已发货', color: 'text-purple-600', bg: 'bg-purple-50', desc: '商品已发货，请留意收货' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-50', desc: '订单已完成，感谢您的购买' },
  cancelled: { label: '已取消', color: 'text-gray-500', bg: 'bg-gray-50', desc: '订单已取消' }
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadOrderDetail();
  }, [id]);

  const loadOrderDetail = async () => {
    try {
      setLoading(true);
      const res = await orderAPI.detail(id);
      if (res.code === 200) {
        setOrder(res.data);
      }
    } catch (error) {
      console.error('加载订单详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 取消订单
  const handleCancelOrder = async () => {
    if (!confirm('确定要取消该订单吗？')) return;
    try {
      setActionLoading('cancel');
      const res = await orderAPI.cancel(id);
      if (res.code === 200) {
        alert('订单已取消');
        loadOrderDetail();
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
  const handleReceiveOrder = async () => {
    if (!confirm('确认已收到商品吗？')) return;
    try {
      setActionLoading('receive');
      const res = await orderAPI.receive(id);
      if (res.code === 200) {
        alert('订单已完成');
        loadOrderDetail();
      } else {
        alert(res.message || '确认收货失败');
      }
    } catch (error) {
      alert('确认收货失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 确认订单
  const handleConfirmOrder = async () => {
    if (!confirm('确认订单吗？确认后将进入配货流程。')) return;
    try {
      setActionLoading('confirm');
      const res = await orderAPI.confirm(id);
      if (res.code === 200) {
        alert('订单已确认');
        loadOrderDetail();
      } else {
        alert(res.message || '确认订单失败');
      }
    } catch (error) {
      alert('确认订单失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 渲染操作按钮
  const renderActionButtons = () => {
    if (!order) return null;
    
    const { status } = order;
    
    // 待付款状态
    if (status === 'pending') {
      return (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 p-4 z-50">
          <button
            onClick={handleConfirmOrder}
            disabled={actionLoading === 'confirm'}
            className="w-full py-3 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 disabled:opacity-50"
          >
            {actionLoading === 'confirm' ? '处理中...' : '确认订单'}
          </button>
        </div>
      );
    }
    
    // 已发货状态
    if (status === 'shipped') {
      return (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 p-4 z-50">
          <button
            onClick={handleReceiveOrder}
            disabled={actionLoading === 'receive'}
            className="w-full py-3 bg-green-500 text-white rounded-full font-medium hover:bg-green-600 disabled:opacity-50"
          >
            {actionLoading === 'receive' ? '处理中...' : '确认收货'}
          </button>
        </div>
      );
    }
    
    // 已完成状态
    if (status === 'completed') {
      return (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 p-4 flex gap-3 z-50">
          <button
            onClick={() => navigate('/order/list')}
            className="flex-1 py-3 border border-gray-300 text-gray-600 rounded-full font-medium hover:bg-gray-50"
          >
            返回订单列表
          </button>
          <Link
            to={`/order/export/${id}`}
            className="flex-1 py-3 bg-green-500 text-white rounded-full font-medium text-center hover:bg-green-600"
          >
            导出订单
          </Link>
        </div>
      );
    }
    
    // 其他状态只显示返回按钮
    return (
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 p-4 z-50">
        <button
          onClick={() => navigate('/order/list')}
          className="w-full py-3 bg-gray-500 text-white rounded-full font-medium hover:bg-gray-600"
        >
          返回订单列表
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-gray-500 mb-4">订单不存在</p>
        <Link to="/order/list" className="px-6 py-2 bg-orange-500 text-white rounded-full">
          返回订单列表
        </Link>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.confirmed;  // 默认回退到已确认状态（兼容旧数据）

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 顶部 */}
      <div className="bg-white p-4 flex items-center sticky top-0 z-10">
        <Link to="/order/list" className="text-2xl mr-4">←</Link>
        <h1 className="text-lg font-medium flex-1">订单详情</h1>
      </div>

      {/* 状态卡片 */}
      <div className={`m-3 p-4 rounded-xl ${statusInfo.bg}`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl ${statusInfo.color}`}>
            {order.status === 'confirmed' && '✅'}
            {order.status === 'shipped' && '🚚'}
            {order.status === 'completed' && '🎉'}
            {order.status === 'cancelled' && '❌'}
          </div>
          <div>
            <p className={`font-bold text-lg ${statusInfo.color}`}>{statusInfo.label}</p>
            <p className="text-sm text-gray-500">{statusInfo.desc}</p>
          </div>
        </div>
      </div>

      {/* 订单信息 */}
      <div className="mx-3 mb-3 bg-white rounded-xl p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-500">订单编号</span>
          <span className="font-mono text-sm">{order.order_no}</span>
        </div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-500">下单时间</span>
          <span className="text-sm">{new Date(order.created_at).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">支付方式</span>
          <span className="text-orange-500 font-medium">货到付款</span>
        </div>
      </div>

      {/* 收货信息 */}
      <div className="mx-3 mb-3 bg-white rounded-xl p-4">
        <h3 className="font-medium mb-3">收货信息</h3>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xl">📍</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{order.contact}</span>
              <span className="text-gray-500 text-sm">{order.phone}</span>
            </div>
            <p className="text-gray-600 text-sm">{order.address}</p>
            {order.remark && (
              <p className="text-gray-400 text-xs mt-2">备注：{order.remark}</p>
            )}
          </div>
        </div>
      </div>

      {/* 商品列表 */}
      <div className="mx-3 mb-3 bg-white rounded-xl p-4">
        <h3 className="font-medium mb-3">商品清单</h3>
        <div className="space-y-4">
          {order.items?.map(item => (
            <div key={item.id} className="flex gap-3">
              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={item.image || getPlaceholderSrc()}
                  alt={item.product_name}
                  className="w-20 h-20 object-cover"
                  onError={(e) => {
                    e.target.src = getPlaceholderSrc();
                  }}
                />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <p className="font-medium text-gray-800">{item.product_name}</p>
                  <p className="text-sm text-gray-400 mt-1">{item.specs}</p>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-gray-900 font-medium">฿{Number(item.price).toFixed(2)}</span>
                    <span className="text-gray-400 text-sm ml-2">x{item.quantity}</span>
                    {/* 配货数量显示 */}
                    {(item.actual_qty || item.actual_qty === 0) && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                        配货:{item.actual_qty}
                      </span>
                    )}
                  </div>
                  <span className="text-orange-500 font-medium">
                    ฿{Number(item.subtotal).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 金额明细 */}
      <div className="mx-3 mb-3 bg-white rounded-xl p-4">
        <h3 className="font-medium mb-3">金额明细</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">商品总额</span>
            <span>฿{Number(order.total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">运费</span>
            <span className="text-green-500">免运费</span>
          </div>
          <div className="border-t border-gray-100 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">应付总额</span>
              <span className="text-xl font-bold text-orange-500">
                ฿{Number(order.total).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      {renderActionButtons()}
    </div>
  );
}
