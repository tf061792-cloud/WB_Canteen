import { useState, useEffect } from 'react';
import { orderAPI, pickerAPI, productAPI } from '../api/index';

const STATUS_MAP = {
  pending: { label: '已提交', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: '已确认', color: 'bg-blue-100 text-blue-700' },
  picked: { label: '已配货', color: 'bg-orange-100 text-orange-700' },
  shipped: { label: '已发货', color: 'bg-purple-100 text-purple-700' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-700' }
};

const NEXT_STATUS = {
  picked: { status: 'shipped', label: '确认发货' },
  shipped: { status: 'completed', label: '确认完成' }
};

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updating, setUpdating] = useState(false);

  // 编辑明细相关状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItems, setEditingItems] = useState([]);
  const [editLoading, setEditLoading] = useState(false);

  // 配货确认相关状态
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [pickerItems, setPickerItems] = useState({});
  const [pickerQuantities, setPickerQuantities] = useState({});
  const [pickerMode, setPickerMode] = useState('pick');
  const [hasQuantityDiff, setHasQuantityDiff] = useState(false);

  // 财务更新模态框状态
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [financeData, setFinanceData] = useState({ expectedCost: '', expectedSales: '', expectedProfit: '', customsFee: '', actualCost: '', actualAmount: '' });

  const checkQuantityDiff = (order) => {
    if (!order?.items) return false;
    return order.items.some(item => (item.actual_qty || 0) !== item.quantity);
  };

  const pageSize = 10;

  useEffect(() => {
    loadOrders();
  }, [page, status]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = { page, pageSize };
      if (status) params.status = status;
      if (keyword) params.keyword = keyword;

      const res = await orderAPI.list(params);
      if (res.code === 200) {
        setOrders(res.data.list);
        setTotal(res.data.total);
      }
    } catch (error) {
      console.error('加载订单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadOrders();
  };

  const handleExport = (order) => {
    // 按照用户要求的格式导出
    const formatPrice = (price) => {
      return `฿ ${Number(price).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const rows = [];
    
    // 订单信息行
    rows.push([
      order.user_name || order.username || '-',
      order.phone || '-',
      `采购订单明细`,
      order.order_no,
      new Date(order.created_at).toISOString().slice(0, 10),
      formatPrice(order.total)
    ]);
    
    // 空行
    rows.push(['', '', '', '', '', '']);
    
    // 商品表头
    rows.push(['商品名称', '泰文名称', '数量', '单价', '小计']);
    
    // 商品数据
    const items = order.items || [];
    items.forEach(item => {
      rows.push([
        item.product_name,
        item.name_th || '-',
        `${item.quantity}${item.unit || '件'}`,
        `฿ ${Number(item.price).toFixed(2)}`,
        formatPrice(Number(item.price) * item.quantity)
      ]);
    });
    
    // 空行
    rows.push(['', '', '', '', '', '']);

    const BOM = '\uFEFF';
    let csvContent = BOM;

    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `订单明细_${order.order_no}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    if (!confirm(`确定要${newStatus === 'cancelled' ? '取消' : '更新'}该订单吗？`)) return;

    try {
      setUpdating(true);
      const actionMap = {
        'shipped': 'ship',
        'completed': 'receive',
        'cancelled': 'cancel'
      };
      const action = actionMap[newStatus] || 'update';
      const res = await orderAPI[action](orderId);
      if (res.code === 200) {
        loadOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
        alert('操作成功');
      } else {
        alert(res.message);
      }
    } catch (error) {
      alert('操作失败: ' + (error.message || '未知错误'));
    } finally {
      setUpdating(false);
    }
  };

  // 商品成本价状态
  const [productCosts, setProductCosts] = useState({});

  // 打开财务更新模态框
  const openFinanceModal = async (order) => {
    setSelectedOrder(order);
    
    // 计算预期采购成本（从商品管理模块获取成本价）
    let expectedCost = 0;
    const costs = {};
    
    console.log('开始获取成本价，订单商品:', order.items);
    
    if (order.items) {
      for (const item of order.items) {
        try {
          console.log('获取商品成本价, 商品ID:', item.product_id);
          // 直接通过商品ID获取商品信息
          const res = await productAPI.getById(item.product_id);
          console.log('通过ID查询商品结果:', res);
          
          if (res.code === 200 && res.data) {
            const productData = res.data;
            console.log('商品数据:', productData);
            // 检查商品数据中是否有 cost_price
            if (productData.cost_price !== undefined && productData.cost_price !== null) {
              console.log('找到成本价:', productData.cost_price);
              costs[item.id] = productData.cost_price;
              expectedCost += productData.cost_price * item.quantity;
            } else {
              console.log('商品没有成本价');
              costs[item.id] = 0;
            }
          } else {
            console.log('通过ID未找到商品');
            costs[item.id] = 0;
          }
        } catch (err) {
          console.error('获取商品成本价失败:', err);
          costs[item.id] = 0;
        }
      }
    }
    
    
    // 计算预期销售额（从订单商品计算）
    let expectedSales = 0;
    if (order.items) {
      for (const item of order.items) {
        expectedSales += item.price * item.quantity;
      }
    }
    
    // 计算预期利润（预期销售额 - 预期采购成本 - 海关运输费）
    const customsFee = parseFloat(order.customs_fee || 0) || 0;
    const expectedProfit = expectedSales - expectedCost - customsFee;
    
    console.log('获取成本价完成，结果:', costs);
    console.log('预期采购成本:', expectedCost);
    console.log('预期销售额:', expectedSales);
    console.log('海关运输费:', customsFee);
    console.log('预期利润:', expectedProfit);
    
    setProductCosts(costs);
    setFinanceData({
      expectedCost: expectedCost.toFixed(2),
      expectedSales: expectedSales.toFixed(2),
      expectedProfit: expectedProfit.toFixed(2),
      customsFee: order.customs_fee ? String(order.customs_fee) : '',
      actualCost: order.actual_cost ? String(order.actual_cost) : '',
      actualAmount: order.actual_amount ? String(order.actual_amount) : ''
    });
    setShowFinanceModal(true);
  };

  // 计算利润
  const calculateProfit = () => {
    const cost = parseFloat(financeData.actualCost) || 0;
    const amount = parseFloat(financeData.actualAmount) || 0;
    const customsFee = parseFloat(financeData.customsFee) || 0;
    return (amount - cost - customsFee).toFixed(2);
  };

  // 确认更新财务信息
  const handleConfirmFinance = async () => {
    if (!selectedOrder) return;

    const actualCost = parseFloat(financeData.actualCost);
    const actualAmount = parseFloat(financeData.actualAmount);

    if (isNaN(actualCost) || isNaN(actualAmount)) {
      alert('请输入有效的数字');
      return;
    }

    const profitAmount = calculateProfit();

    try {
      setUpdating(true);
      const res = await orderAPI.update(selectedOrder.id, {
        actual_cost: actualCost,
        actual_amount: actualAmount,
        profit_amount: parseFloat(profitAmount),
        customs_fee: parseFloat(financeData.customsFee) || 0
      });
      if (res.code === 200) {
        setShowFinanceModal(false);
        loadOrders();
        alert('更新成功');
      } else {
        alert(res.message);
      }
    } catch (error) {
      alert('更新失败');
    } finally {
      setUpdating(false);
    }
  };

  // 打开编辑明细弹窗
  const openEditModal = async (order) => {
    setSelectedOrder(order);
    // 初始化编辑数据，优先使用实际配货数量和配货端更新的商品信息
    const initialItems = order.items?.map(item => ({
      ...item,
      // 使用实际配货数量，如果没有则使用原订单数量
      display_quantity: item.actual_qty !== undefined && item.actual_qty !== null ? item.actual_qty : item.quantity,
      // 保存实际配货数量，用于后续更新
      actual_qty: item.actual_qty !== undefined && item.actual_qty !== null ? item.actual_qty : item.quantity
    })) || [];

    console.log('📋 打开编辑弹窗 - 订单商品数据:', initialItems);

    // 自动查询商品表中每个商品的当前价格（只更新价格，不覆盖商品名称和泰文名称）
    const updatedItems = await Promise.all(
      initialItems.map(async (item) => {
        // 先尝试用中文名称查询，再尝试用泰文名称查询
        const searchName = item.product_name || item.name_th;
        if (searchName && searchName.trim()) {
          try {
            const res = await productAPI.searchByName(searchName);
            if (res.code === 200 && res.data) {
              // 只使用商品表中的当前价格，保留订单中的商品名称、泰文名称和单位
              return {
                ...item,
                price: res.data.price,
                subtotal: ((item.display_quantity || 0) * res.data.price).toFixed(2)
              };
            }
          } catch (err) {
            console.error('查询商品价格失败:', err);
          }
        }
        return item;
      })
    );

    console.log('📋 打开编辑弹窗 - 更新后的数据:', updatedItems);

    setEditingItems(updatedItems);
    setShowEditModal(true);
  };

  const handleQuantityChange = (index, value) => {
    const newItems = [...editingItems];
    const quantity = parseInt(value) || 0;
    newItems[index].display_quantity = quantity;
    newItems[index].subtotal = (quantity * newItems[index].price).toFixed(2);
    setEditingItems(newItems);
  };

  const handlePriceChange = (index, value) => {
    const newItems = [...editingItems];
    const price = parseFloat(value) || 0;
    newItems[index].price = price;
    newItems[index].subtotal = (newItems[index].display_quantity * price).toFixed(2);
    setEditingItems(newItems);
  };

  const handleProductNameChange = (index, value) => {
    setEditingItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index] = { ...newItems[index], product_name: value };
      
      // 自动查询新商品的价格
      if (value && value.trim()) {
        productAPI.searchByName(value).then(res => {
          if (res.code === 200 && res.data) {
            setEditingItems(currentItems => {
              const updatedItems = [...currentItems];
              updatedItems[index] = {
                ...updatedItems[index],
                price: res.data.price,
                unit: res.data.unit,
                name_th: res.data.name_th,
                subtotal: ((updatedItems[index].display_quantity || 0) * res.data.price).toFixed(2)
              };
              return updatedItems;
            });
          }
        }).catch(err => {
          console.error('查询商品价格失败:', err);
        });
      }
      
      return newItems;
    });
  };

  const handleNameThChange = (index, value) => {
    setEditingItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index] = { ...newItems[index], name_th: value };
      
      // 如果泰文名称变化，也尝试查询商品价格
      if (value && value.trim()) {
        productAPI.searchByName(value).then(res => {
          if (res.code === 200 && res.data) {
            setEditingItems(currentItems => {
              const updatedItems = [...currentItems];
              updatedItems[index] = {
                ...updatedItems[index],
                price: res.data.price,
                unit: res.data.unit,
                product_name: res.data.name,
                subtotal: ((updatedItems[index].display_quantity || 0) * res.data.price).toFixed(2)
              };
              return updatedItems;
            });
          }
        }).catch(err => {
          console.error('查询商品价格失败:', err);
        });
      }
      
      return newItems;
    });
  };

  const calculateTotal = () => {
    return editingItems.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0).toFixed(2);
  };

  const saveOrderItems = async () => {
    if (!confirm('确定要保存修改吗？修改后将同步到客户端订单。')) return;

    try {
      setEditLoading(true);
      // 准备保存数据，将display_quantity映射到quantity和actual_qty
      const saveItems = editingItems.map(item => ({
        ...item,
        quantity: item.display_quantity, // 更新订单数量
        actual_qty: item.display_quantity  // 更新实际配货数量
      }));
      const res = await orderAPI.updateItems(selectedOrder.id, {
        items: saveItems,
        total: parseFloat(calculateTotal())
      });
      if (res.code === 200) {
        alert('保存成功');
        setShowEditModal(false);
        loadOrders();
        if (selectedOrder) {
          setSelectedOrder({
            ...selectedOrder,
            items: saveItems,
            total: parseFloat(calculateTotal())
          });
        }
      } else {
        alert(res.message);
      }
    } catch (error) {
      alert('保存失败');
    } finally {
      setEditLoading(false);
    }
  };

  const openPickerModal = (order) => {
    setSelectedOrder(order);
    const initialPickerState = {};
    const initialQuantities = {};
    order.items?.forEach(item => {
      initialPickerState[item.id] = true;
      initialQuantities[item.id] = item.quantity;
    });
    setPickerItems(initialPickerState);
    setPickerQuantities(initialQuantities);
    setShowPickerModal(true);
  };

  const handleConfirmPicker = async () => {
    if (!selectedOrder) return;

    const pickedCount = Object.values(pickerItems).filter(Boolean).length;
    const totalCount = selectedOrder.items?.length || 0;

    if (pickedCount === 0) {
      alert('请至少选择一件商品');
      return;
    }

    try {
      setUpdating(true);

      const pickedItems = selectedOrder.items?.map(item => ({
        item_id: item.id,
        product_id: item.product_id,
        name: item.product_name,
        ordered_quantity: item.quantity,
        picked_quantity: pickerQuantities[item.id] || 0,
        unit: item.unit || '件',
        picked: pickerItems[item.id] || false
      })) || [];

      const pickerNoteLines = pickedItems
        .filter(item => item.picked)
        .map(item => `${item.name}: 订购${item.ordered_quantity}${item.unit} 实际配货${item.picked_quantity}${item.unit}`);

      const pickerNote = `配货完成: ${pickedCount}/${totalCount} 件商品\n${pickerNoteLines.join('\n')}`;

      const res = await orderAPI.update(selectedOrder.id, {
        status: 'picked',
        picker_note: pickerNote,
        picked_items: pickedItems
      });

      if (res.code === 200) {
        setShowPickerModal(false);
        setPickerItems({});
        setPickerQuantities({});
        setSelectedOrder(null);
        loadOrders();
        alert('配货确认成功！订单状态已更新为已配货');
      } else {
        alert(res.message || '配货确认失败');
      }
    } catch (error) {
      console.error('配货确认失败:', error);
      alert('配货确认失败: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const tabs = [
    { value: '', label: '全部' },
    { value: 'pending', label: '待确认' },
    { value: 'confirmed', label: '已确认' },
    { value: 'picked', label: '已配货' },
    { value: 'shipped', label: '已发货' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' }
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">订单管理</h1>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex gap-4 mb-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="搜索订单号/用户名/昵称"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              搜索
            </button>
          </form>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                status === tab.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">订单号</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">用户</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">订单金额</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">采购成本</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">回款金额</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">状态</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">配货信息</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">下单时间</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="8" className="px-3 py-6 text-center text-gray-500">加载中...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-3 py-6 text-center text-gray-500">暂无订单</td>
              </tr>
            ) : (
              orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-xs">{order.order_no}</td>
                  <td className="px-3 py-2">
                    <div>
                      <p className="font-medium text-xs">{order.user_nickname || order.username}</p>
                      <p className="text-[10px] text-gray-500">{order.username}</p>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-bold text-orange-500 text-xs">฿{Number(order.total).toFixed(2)}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-gray-700 text-xs">{order.actual_cost ? `฿${Number(order.actual_cost).toFixed(2)}` : '-'}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-green-600 font-medium text-xs">{order.actual_amount ? `฿${Number(order.actual_amount).toFixed(2)}` : '-'}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${STATUS_MAP[order.status]?.color}`}>
                      {STATUS_MAP[order.status]?.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {order.picked_by ? (
                      <div className="text-gray-600">
                        <div className="text-green-600">已配货</div>
                        <div className="text-[10px]">{order.picked_by_name}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {order.status === 'picked' && (
                        <button
                          onClick={() => {
                            if (confirm('确定要确认发货吗？')) {
                              handleUpdateStatus(order.id, 'shipped');
                            }
                          }}
                          disabled={updating}
                          className="px-2 py-0.5 bg-orange-500 text-white text-[10px] rounded hover:bg-orange-600 disabled:opacity-50"
                        >
                          确认发货
                        </button>
                      )}
                      {order.status === 'shipped' && (
                        <button
                          onClick={() => {
                            if (confirm('确定要确认完成吗？')) {
                              handleUpdateStatus(order.id, 'completed');
                            }
                          }}
                          disabled={updating}
                          className="px-2 py-0.5 bg-green-600 text-white text-[10px] rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          确认完成
                        </button>
                      )}
                      {['pending', 'confirmed', 'picked'].includes(order.status) && (
                        <button
                          onClick={() => {
                            if (confirm('确定要取消该订单吗？')) {
                              handleUpdateStatus(order.id, 'cancelled');
                            }
                          }}
                          disabled={updating}
                          className="px-2 py-0.5 border border-red-500 text-red-500 text-[10px] rounded hover:bg-red-50 disabled:opacity-50"
                        >
                          取消
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('确定要编辑该订单吗？')) {
                            openEditModal(order);
                          }
                        }}
                        className={`px-2 py-0.5 text-[10px] rounded ${
                          order.hasDifference
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {order.hasDifference ? '更新' : '编辑'}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('确定要查看成本明细吗？')) {
                            openFinanceModal(order);
                          }
                        }}
                        disabled={updating}
                        className="px-2 py-0.5 bg-green-500 text-white text-[10px] rounded hover:bg-green-600 disabled:opacity-50"
                      >
                        成本明细
                      </button>
                      {order.status === 'confirmed' && (
                        <button
                          onClick={() => {
                            if (confirm('确定要开始配货吗？')) {
                              openPickerModal(order);
                            }
                          }}
                          className="px-2 py-0.5 bg-purple-500 text-white text-[10px] rounded hover:bg-purple-600"
                        >
                          配货
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('确定要导出订单明细吗？')) {
                            handleExport(order);
                          }
                        }}
                        className="px-2 py-0.5 bg-gray-600 text-white text-[10px] rounded hover:bg-gray-700"
                      >
                        导出
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {total > pageSize && (
          <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm text-gray-500">共 {total} 条</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                上一页
              </button>
              <span className="px-3 py-1">第 {page} / {Math.ceil(total / pageSize)} 页</span>
              <button
                onClick={() => setPage(Math.min(Math.ceil(total / pageSize), page + 1))}
                disabled={page >= Math.ceil(total / pageSize)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 成本明细模态框 */}
      {showFinanceModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[80vh] overflow-auto m-4">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h3 className="font-bold text-lg">成本明细</h3>
                <p className="text-sm text-gray-500">订单号：{selectedOrder.order_no}</p>
              </div>
              <button
                onClick={() => setShowFinanceModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              {/* 订单明细表格 */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">商品明细</h4>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium">商品名称</th>
                        <th className="px-3 py-2 text-left text-sm font-medium">单价</th>
                        <th className="px-3 py-2 text-center text-sm font-medium">数量</th>
                        <th className="px-3 py-2 text-center text-sm font-medium">成本价</th>
                        <th className="px-3 py-2 text-right text-sm font-medium">成本小计</th>
                        <th className="px-3 py-2 text-right text-sm font-medium">销售小计</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedOrder.items?.map((item, index) => {
                        const costPrice = productCosts[item.id] || 0;
                        const costSubtotal = costPrice * item.quantity;
                        const salesSubtotal = item.price * item.quantity;
                        return (
                          <tr key={item.id}>
                            <td className="px-3 py-3">
                              <div>
                                <div className="font-medium">{item.product_name}</div>
                                {item.name_th && (
                                  <div className="text-xs text-orange-600">{item.name_th}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right">฿{Number(item.price).toFixed(2)}</td>
                            <td className="px-3 py-3 text-center">{item.quantity}{item.unit || '件'}</td>
                            <td className="px-3 py-3 text-center">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={costPrice}
                                onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setProductCosts(prev => {
                                  const newCosts = { ...prev, [item.id]: value };
                                  
                                  // 重新计算预期采购成本
                                  let newExpectedCost = 0;
                                  if (selectedOrder?.items) {
                                    for (const item of selectedOrder.items) {
                                      newExpectedCost += (newCosts[item.id] || 0) * item.quantity;
                                    }
                                  }
                                  
                                  // 重新计算预期销售额
                                  let newExpectedSales = 0;
                                  if (selectedOrder?.items) {
                                    for (const item of selectedOrder.items) {
                                      newExpectedSales += item.price * item.quantity;
                                    }
                                  }
                                  
                                  // 重新计算预期利润
                                  const customsFee = parseFloat(financeData.customsFee) || 0;
                                  const newExpectedProfit = newExpectedSales - newExpectedCost - customsFee;
                                  
                                  // 更新财务数据
                                  setFinanceData(prev => ({
                                    ...prev,
                                    expectedCost: newExpectedCost.toFixed(2),
                                    expectedProfit: newExpectedProfit.toFixed(2)
                                  }));
                                  
                                  return newCosts;
                                });
                              }}
                                className="w-24 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                              />
                            </td>
                            <td className="px-3 py-3 text-right font-medium">฿{Number(costSubtotal).toFixed(2)}</td>
                            <td className="px-3 py-3 text-right font-medium">฿{Number(salesSubtotal).toFixed(2)}</td>
                          </tr>
                        );
                      }) || (
                        <tr>
                          <td colSpan="5" className="px-3 py-6 text-center text-gray-500">暂无商品</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 财务信息 */}
              <div className="space-y-4">
                {/* 预期部分 */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">预期采购成本（元）</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={financeData.expectedCost}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">预期销售额（元）</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={financeData.expectedSales || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">海关运输费（元）</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={financeData.customsFee || ''}
                      onChange={(e) => setFinanceData({ ...financeData, customsFee: e.target.value })}
                      placeholder="请输入海关运输费"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                
                {/* 实际部分 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">实际支出（元）</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={financeData.actualCost}
                      onChange={(e) => setFinanceData({ ...financeData, actualCost: e.target.value })}
                      placeholder="请输入实际支出成本"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">实际回款（元）</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={financeData.actualAmount}
                      onChange={(e) => setFinanceData({ ...financeData, actualAmount: e.target.value })}
                      placeholder="请输入实际回款金额"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                
                {/* 利润部分 */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">预期利润（元）</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={financeData.expectedProfit || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 bg-gray-50"
                    />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">利润：</span>
                    <span className={`text-xl font-bold ${parseFloat(calculateProfit()) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ¥{calculateProfit()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleConfirmFinance}
                  disabled={updating}
                  className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
                >
                  {updating ? '保存中...' : '确认保存'}
                </button>
                <button
                  onClick={() => setShowFinanceModal(false)}
                  disabled={updating}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑明细弹窗 */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[85vh] overflow-auto m-4">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h3 className="font-bold text-lg">编辑订单明细</h3>
                <p className="text-sm text-gray-500">订单号：{selectedOrder.order_no}</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium mb-2">收货信息</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">联系人：</span>
                    <span>{selectedOrder.contact}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">电话：</span>
                    <span>{selectedOrder.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">地址：</span>
                    <span>{selectedOrder.address}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-medium mb-3">商品明细（可编辑）</h4>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-2 text-left text-sm font-medium w-24">商品名称</th>
                        <th className="px-2 py-2 text-left text-sm font-medium w-40">泰文名称</th>
                        <th className="px-2 py-2 text-left text-sm font-medium w-20">规格</th>
                        <th className="px-2 py-2 text-center text-sm font-medium w-16">数量</th>
                        <th className="px-2 py-2 text-center text-sm font-medium w-20">单价</th>
                        <th className="px-2 py-2 text-right text-sm font-medium w-20">小计</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {editingItems.map((item, index) => (
                        <tr key={item.id}>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-1">
                              {item.product_image && (
                                <img
                                  src={item.product_image}
                                  alt={item.product_name}
                                  className="w-8 h-8 object-cover rounded"
                                />
                              )}
                              <input
                                type="text"
                                value={item.product_name}
                                onChange={(e) => handleProductNameChange(index, e.target.value)}
                                className="flex-1 font-medium border border-transparent hover:border-gray-300 focus:border-orange-500 focus:outline-none px-1 rounded min-w-0"
                              />
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <input
                              type="text"
                              value={item.name_th || ''}
                              onChange={(e) => handleNameThChange(index, e.target.value)}
                              className="w-full text-orange-600 border border-transparent hover:border-gray-300 focus:border-orange-500 focus:outline-none px-1 rounded min-w-0 break-words"
                              style={{ wordBreak: 'break-word' }}
                            />
                          </td>
                          <td className="px-2 py-3 text-sm text-gray-600">{item.specs}</td>
                          <td className="px-2 py-3">
                            <div className="text-center">
                              <div className="text-xs text-gray-400 mb-1">
                                下单: {item.quantity}{item.unit || '件'}
                              </div>
                              <input
                                type="number"
                                min="0"
                                value={item.display_quantity}
                                onChange={(e) => handleQuantityChange(index, e.target.value)}
                                className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                              />
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex items-center justify-center">
                              <span className="text-gray-500 mr-1">฿</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.price}
                                onChange={(e) => handlePriceChange(index, e.target.value)}
                                className="w-24 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                              />
                            </div>
                          </td>
                          <td className="px-2 py-3 text-right font-medium text-orange-600">
                            ฿{Number(item.subtotal).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="5" className="px-4 py-3 text-right font-medium">
                          订单总额：
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xl font-bold text-orange-600">
                            ฿{calculateTotal()}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="6" className="px-4 py-2 text-sm text-gray-500">
                          原订单金额：฿{Number(selectedOrder.total).toFixed(2)}
                          {parseFloat(calculateTotal()) !== selectedOrder.total && (
                            <span className="ml-2 text-orange-500">
                              （差额：฿{(parseFloat(calculateTotal()) - selectedOrder.total).toFixed(2)}）
                            </span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">提示：</span>
                  修改数量和单价后，小计会自动计算。保存后修改将同步到客户端订单明细中，方便实际发货数量差异比对。
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveOrderItems}
                  disabled={editLoading}
                  className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
                >
                  {editLoading ? '保存中...' : '确认保存修改'}
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={editLoading}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 配货确认弹窗 */}
      {showPickerModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">
                  配货确认
                </h3>
                <button
                  onClick={() => setShowPickerModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">订单号：</span>{selectedOrder.order_no}</div>
                  <div><span className="text-gray-500">订单金额：</span>฿{Number(selectedOrder.total).toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                <div className="text-sm text-gray-500 mb-2">请核对以下商品并填写实际配货数量：</div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">商品名称</th>
                      <th className="px-3 py-2 text-center w-24">订单数量</th>
                      <th className="px-3 py-2 text-center w-24">配货数量</th>
                      <th className="px-3 py-2 text-center w-20">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(selectedOrder.items || []).map((item, idx) => (
                      <tr key={idx} className={pickerItems[item.id] ? 'bg-green-50' : 'bg-white'}>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-800">
                            {item.product_name || `【无名称-ID:${item.id}】`}
                          </div>
                          <div className="text-xs text-gray-500">{item.specification}</div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.quantity} {item.unit || '件'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={pickerQuantities[item.id] ?? item.quantity}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setPickerQuantities({...pickerQuantities, [item.id]: val});
                              if (val > 0) {
                                setPickerItems({...pickerItems, [item.id]: true});
                              } else {
                                setPickerItems({...pickerItems, [item.id]: false});
                              }
                            }}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <label className="flex items-center justify-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pickerItems[item.id] || false}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setPickerItems({...pickerItems, [item.id]: checked});
                                if (checked && (pickerQuantities[item.id] ?? 0) <= 0) {
                                  setPickerQuantities({...pickerQuantities, [item.id]: item.quantity});
                                }
                                if (!checked) {
                                  setPickerQuantities({...pickerQuantities, [item.id]: 0});
                                }
                              }}
                              className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                            />
                            <span className="text-xs text-gray-600">
                              {pickerItems[item.id] ? '已配' : '未配'}
                            </span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowPickerModal(false)}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleConfirmPicker}
                disabled={Object.values(pickerItems).filter(Boolean).length === 0}
                className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                确认配货 ({Object.values(pickerItems).filter(Boolean).length}/{selectedOrder.items?.length || 0})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}