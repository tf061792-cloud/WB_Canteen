import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const orderAPI = {
  getOrders: () => fetch('/api/orders', { 
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
  }).then(r => r.json()),
  getOrderDetail: (id) => fetch(`/api/orders/${id}`, { 
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
  }).then(r => r.json()),
};

export default function OrderExport() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

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

  const handleExportPDF = () => {
    if (!selectedOrder) {
      alert('请先选择订单');
      return;
    }
    
    setExporting(true);
    
    try {
      const doc = new jsPDF();
      
      // 标题
      doc.setFontSize(18);
      doc.text('WB食堂食材订单', 105, 20, { align: 'center' });
      
      // 订单基本信息
      doc.setFontSize(10);
      doc.text(`订单号: ${selectedOrder.order_no}`, 20, 35);
      doc.text(`下单时间: ${new Date(selectedOrder.created_at).toLocaleString()}`, 20, 42);
      doc.text(`收货人: ${selectedOrder.contact}`, 20, 49);
      doc.text(`联系电话: ${selectedOrder.phone}`, 20, 56);
      doc.text(`收货地址: ${selectedOrder.address}`, 20, 63);
      
      // 商品明细表格
      const tableData = selectedOrder.items?.map(item => [
        item.product_name,
        item.specs || '-',
        `฿${Number(item.price).toFixed(2)}`,
        item.quantity,
        `฿${Number(item.subtotal).toFixed(2)}`
      ]) || [];
      
      doc.autoTable({
        startY: 75,
        head: [['商品名称', '规格', '单价', '数量', '小计']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 107, 53],
          textColor: 255,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 30 },
          2: { cellWidth: 25, halign: 'right' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 30, halign: 'right' }
        }
      });
      
      // 合计金额
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`合计金额: ฿${Number(selectedOrder.total).toFixed(2)}`, 150, finalY, { align: 'right' });
      
      // 备注
      if (selectedOrder.remark) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`备注: ${selectedOrder.remark}`, 20, finalY + 15);
      }
      
      // 底部信息
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text('感谢您的订购 - WB食堂食材供应', 105, 280, { align: 'center' });
      
      // 保存PDF
      doc.save(`订单_${selectedOrder.order_no}.pdf`);
      
      alert('订单导出成功！');
    } catch (e) {
      console.error('导出PDF失败:', e);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
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
      <div className="bg-white p-4 flex items-center justify-between sticky top-0 z-10">
        <Link to="/user" className="text-2xl">←</Link>
        <h1 className="text-lg font-medium">订单导出</h1>
        <button 
          onClick={handleExportPDF}
          disabled={exporting || !selectedOrder}
          className="text-sm bg-orange-500 text-white px-4 py-2 rounded-lg disabled:bg-gray-300"
        >
          {exporting ? '导出中...' : '导出PDF'}
        </button>
      </div>

      <div className="flex h-[calc(100vh-60px)]">
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
                  <span className="text-sm font-bold text-orange-500">฿{order.total}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 右侧预览 */}
        <div className="w-1/2 bg-gray-100 overflow-y-auto p-4">
          <div className="bg-white p-6 min-h-[600px] shadow-sm">
            {selectedOrder ? (
              <>
                {/* 头部 */}
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
                        <td className="text-right py-2">฿{Number(item.price).toFixed(2)}</td>
                        <td className="text-right py-2">{item.quantity}</td>
                        <td className="text-right py-2">฿{Number(item.subtotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* 合计 */}
                <div className="border-t-2 border-gray-800 pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>合计金额:</span>
                    <span>฿{Number(selectedOrder.total).toFixed(2)}</span>
                  </div>
                  {selectedOrder.remark && (
                    <div className="mt-4 text-sm text-gray-500">
                      <span>备注: {selectedOrder.remark}</span>
                    </div>
                  )}
                </div>

                {/* 底部 */}
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
    </div>
  );
}
