import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const orderAPI = {
  getOrders: () => fetch('/api/orders', { 
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
  }).then(r => r.json()),
  getOrderDetail: (id) => fetch(`/api/orders/${id}`, { 
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
  }).then(r => r.json()),
};

export default function OrderPrint() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await orderAPI.getOrders();
      if (res.code === 200) {
        setOrders(res.data || []);
      }
    } catch (e) {
      console.error('加载订单失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = async (order) => {
    try {
      const res = await orderAPI.getOrderDetail(order.id);
      if (res.code === 200) {
        setSelectedOrder(res.data);
      }
    } catch (e) {
      console.error('加载订单详情失败:', e);
    }
  };

  const handlePrint = () => {
    if (!selectedOrder) {
      alert('请先选择订单');
      return;
    }
    window.print();
  };

  const statusMap = {
    confirmed: { name: '已确认', color: 'bg-blue-100 text-blue-600' },
    shipped: { name: '已发货', color: 'bg-purple-100 text-purple-600' },
    completed: { name: '已完成', color: 'bg-green-100 text-green-600' },
    cancelled: { name: '已取消', color: 'bg-gray-100 text-gray-600' }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部 */}
      <div className="bg-white p-4 flex items-center justify-between sticky top-0 z-10 no-print">
        <Link to="/user" className="text-2xl">←</Link>
        <h1 className="text-lg font-medium">打印订单明细</h1>
        <button 
          onClick={handlePrint}
          className="text-sm bg-orange-500 text-white px-4 py-2 rounded-lg"
        >
          打印
        </button>
      </div>

      <div className="flex h-[calc(100vh-60px)] no-print">
        {/* 左侧订单列表 */}
        <div className="w-1/2 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-3 bg-gray-50 text-sm font-medium text-gray-500">选择订单</div>
          {loading ? (
            <div className="p-4 text-center text-gray-400">加载中...</div>
          ) : orders.length === 0 ? (
            <div className="p-4 text-center text-gray-400">暂无订单</div>
          ) : (
            orders.map(order => (
              <div 
                key={order.id}
                onClick={() => handleSelectOrder(order)}
                className={`p-4 border-b border-gray-100 cursor-pointer ${
                  selectedOrder?.id === order.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium">{order.order_no}</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(order.created_at).toLocaleString()}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${statusMap[order.status]?.color || 'bg-gray-100'}`}>
                    {statusMap[order.status]?.name || order.status}
                  </span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-gray-500">{order.items?.length || 0}件商品</span>
                  <span className="text-sm font-bold text-orange-500">¥{order.total}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 右侧打印预览 */}
        <div className="w-1/2 bg-gray-100 overflow-y-auto p-4">
          <div className="bg-white p-6 min-h-[600px] shadow-sm" id="print-area">
            {selectedOrder ? (
              <>
                {/* 打印头部 */}
                <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
                  <h2 className="text-xl font-bold">WB食堂食材订单</h2>
                  <p className="text-sm text-gray-500 mt-1">订单号: {selectedOrder.order_no}</p>
                </div>

                {/* 订单信息 */}
                <div className="mb-4 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">下单时间:</span>
                    <span>{new Date(selectedOrder.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">收货人:</span>
                    <span>{selectedOrder.contact}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">联系电话:</span>
                    <span>{selectedOrder.phone}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">收货地址:</span>
                    <span>{selectedOrder.address}</span>
                  </div>
                </div>

                {/* 商品明细 */}
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="border-b-2 border-gray-800">
                      <th className="text-left py-2">商品名称</th>
                      <th className="text-center py-2">规格</th>
                      <th className="text-right py-2">单价</th>
                      <th className="text-right py-2">数量</th>
                      <th className="text-right py-2">小计</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="py-2">{item.product_name}</td>
                        <td className="text-center py-2">{item.specs}</td>
                        <td className="text-right py-2">¥{item.price}</td>
                        <td className="text-right py-2">{item.quantity}</td>
                        <td className="text-right py-2">¥{item.subtotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* 合计 */}
                <div className="border-t-2 border-gray-800 pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>合计金额:</span>
                    <span>¥{selectedOrder.total}</span>
                  </div>
                  {selectedOrder.remark && (
                    <div className="mt-4 text-sm text-gray-500">
                      <span>备注: {selectedOrder.remark}</span>
                    </div>
                  )}
                </div>

                {/* 打印底部 */}
                <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-400">
                  <p>感谢您的订购</p>
                  <p className="mt-1">WB食堂食材供应</p>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400 py-20">
                <div className="text-4xl mb-2">📋</div>
                <p>请选择左侧订单查看详情</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 打印样式 */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          #print-area {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
