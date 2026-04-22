import { useState, useEffect, useCallback } from 'react';
import { adminAPI, pricingAPI } from '../api/index';

// Toast 提示组件
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  
  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`}>
      {message}
    </div>
  );
}

function PricingManage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState(null);
  const pageSize = 50; // 每页显示50条记录，适合大量数据编辑

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, categoryId, keyword]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await adminAPI.get('/products/categories');
      if (res.code === 200) {
        setCategories(res.data);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = { page, pageSize };
      if (categoryId) params.category_id = categoryId;
      if (keyword) params.keyword = keyword;

      const res = await pricingAPI.list(params);
      if (res.code === 200) {
        setProducts(res.data.list);
        setTotal(res.data.total);
      }
    } catch (error) {
      console.error('获取商品列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await adminAPI.get('/admin/pricing/stats');
      if (res.code === 200) {
        setStats(res.data);
      }
    } catch (error) {
      console.error('获取统计失败:', error);
    }
  };

  // 计算利润
  const calculateProfit = (product) => {
    const cost = parseFloat(product.cost_price) || 0;
    const profit = parseFloat(product.profit_weight) || 0;
    if (cost > 0 && profit >= 0) {
      return (profit / cost * 100).toFixed(1);
    }
    return 0;
  };

  // 计算销售价
  const calculateSalePrice = (product) => {
    const cost = parseFloat(product.cost_price) || 0;
    const profit = parseFloat(product.profit_weight) || 0;
    return (cost + profit).toFixed(2);
  };

  // 点击单元格开始编辑
  const handleCellClick = (product, field) => {
    if (savingId) return; // 保存中不允许编辑其他单元格
    setEditingId(product.id);
    setEditField(field);
    setEditValue(product[field] || '');
  };

  // 乐观更新本地数据
  const updateProductLocal = (productId, field, value) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const updated = { ...p, [field]: value };
        // 如果修改了成本价或利润加权，自动更新售价显示
        if (field === 'cost_price' || field === 'profit_weight') {
          updated.sale_price = calculateSalePrice(updated);
        }
        return updated;
      }
      return p;
    }));
  };

  // 保存编辑 - 使用乐观更新
  const handleSave = async () => {
    if (!editingId || !editField) return;
    
    const numValue = parseFloat(editValue);
    if (isNaN(numValue) || numValue < 0) {
      showToast('请输入有效的数值', 'error');
      return;
    }

    // 保存原始值用于回滚
    const originalProduct = products.find(p => p.id === editingId);
    const originalValue = originalProduct?.[editField];

    // 乐观更新：立即更新本地状态
    updateProductLocal(editingId, editField, numValue);
    setSavingId(editingId);
    setEditingId(null);
    setEditField('');
    setEditValue('');

    try {
      const res = await pricingAPI.update(editingId, {
        [editField]: numValue
      });
      
      if (res.code === 200) {
        showToast('保存成功', 'success');
        // 延迟刷新统计数据，不立即刷新列表
        setTimeout(() => {
          fetchStats();
        }, 500);
      } else {
        // 失败时回滚
        updateProductLocal(editingId, editField, originalValue);
        showToast(res.message || '保存失败', 'error');
      }
    } catch (error) {
      // 失败时回滚
      updateProductLocal(editingId, editField, originalValue);
      showToast('保存失败，请重试', 'error');
      console.error('保存失败:', error);
    } finally {
      setSavingId(null);
    }
  };

  // 取消编辑
  const handleCancel = () => {
    setEditingId(null);
    setEditField('');
    setEditValue('');
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // 渲染可编辑单元格
  const renderEditableCell = (product, field, value, prefix = '', suffix = '') => {
    const isEditing = editingId === product.id && editField === field;
    const isSaving = savingId === product.id;
    
    if (isEditing) {
      return (
        <div className="flex items-center space-x-1">
          <span className="text-gray-500">{prefix}</span>
          <input
            type="number"
            step="0.01"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-20 px-2 py-1 border-2 border-blue-500 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            autoFocus
          />
          <span className="text-gray-500">{suffix}</span>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="text-green-600 hover:text-green-800 text-xs font-bold px-1 disabled:opacity-50"
            title="保存 (Enter)"
          >
            ✓
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="text-red-600 hover:text-red-800 text-xs font-bold px-1 disabled:opacity-50"
            title="取消 (Esc)"
          >
            ✕
          </button>
        </div>
      );
    }

    const displayValue = value !== null && value !== undefined ? `${prefix}${value}${suffix}` : '-';
    return (
      <button
        onClick={() => handleCellClick(product, field)}
        disabled={savingId !== null}
        className={`text-blue-600 hover:text-blue-800 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${isSaving ? 'animate-pulse' : ''}`}
        title="点击修改"
      >
        {isSaving ? '保存中...' : displayValue}
      </button>
    );
  };

  return (
    <div className="p-6">
      {/* Toast 提示 */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">价格管理</h1>
          <p className="text-sm text-gray-500 mt-1">点击数值可直接修改，售价 = 采购价 + 利润加权</p>
        </div>
        <div className="flex gap-4">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部分类</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="搜索商品名称"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">商品总数</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total_products}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">已设置采购价</p>
            <p className="text-2xl font-bold text-green-600">{stats.cost_set_products}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">已设置利润加权</p>
            <p className="text-2xl font-bold text-purple-600">{stats.profit_set_products || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">平均利润率</p>
            <p className="text-2xl font-bold text-orange-600">{parseFloat(stats.avg_profit_percent || 0).toFixed(1)}%</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">待设置</p>
            <p className="text-2xl font-bold text-red-600">{(stats.total_products || 0) - (stats.cost_set_products || 0)}</p>
          </div>
        </div>
      )}

      {/* 计算公式说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">计算公式</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">售价 = </span>
            <span className="font-medium text-blue-700">采购价 + 利润加权</span>
          </div>
          <div>
            <span className="text-gray-600">利润率 = </span>
            <span className="font-medium text-blue-700">利润加权 ÷ 采购价 × 100%</span>
          </div>
          <div>
            <span className="text-gray-600">毛利润 = </span>
            <span className="font-medium text-blue-700">利润加权（固定值）</span>
          </div>
        </div>
      </div>

      {/* 快捷键提示 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-sm text-gray-600">
        <span className="font-medium">快捷键：</span>
        点击单元格编辑 → 输入数值 → <kbd className="px-2 py-1 bg-gray-200 rounded">Enter</kbd> 保存 / <kbd className="px-2 py-1 bg-gray-200 rounded">Esc</kbd> 取消
      </div>

      {loading ? (
        <div className="text-center py-10">加载中...</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">商品图片</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">商品名称</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">分类</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">规格</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">采购价</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">利润加权</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">售价</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">利润率</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-3 py-1">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-8 h-8 object-cover rounded"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/32'; }}
                      />
                    </td>
                    <td className="px-3 py-1 text-gray-900 font-medium">{product.name}</td>
                    <td className="px-3 py-1 text-gray-500">{product.category_icon} {product.category_name}</td>
                    <td className="px-3 py-1 text-gray-500">{product.specs}</td>
                    <td className="px-3 py-1">
                      {renderEditableCell(product, 'cost_price', product.cost_price, '¥')}
                    </td>
                    <td className="px-3 py-1">
                      {renderEditableCell(product, 'profit_weight', product.profit_weight, '+¥')}
                    </td>
                    <td className="px-3 py-1 font-bold text-blue-600">
                      ¥{calculateSalePrice(product)}
                    </td>
                    <td className="px-3 py-1">
                      <span className={`font-medium ${parseFloat(calculateProfit(product)) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {calculateProfit(product)}%
                      </span>
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

export default PricingManage;
