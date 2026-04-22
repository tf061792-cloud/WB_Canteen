import { useState, useEffect } from 'react';
import { productAPI } from '../api/index';
import { requestCache } from '../utils/requestCache';

export default function CategoryList() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    sort_order: 0
  });
  
  // 批量设置相关状态
  const [showBatchSetModal, setShowBatchSetModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isBatchSetting, setIsBatchSetting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      // 清除分类缓存，确保获取最新数据
      requestCache.clearByPrefix('/products/categories');
      const res = await productAPI.categories();
      if (res.code === 200) {
        // 确保分类列表按照 sort_order 升序排序
        const sortedCategories = [...res.data].sort((a, b) => {
          return (a.sort_order || 0) - (b.sort_order || 0);
        });
        setCategories(sortedCategories);
      }
    } catch (error) {
      console.error('加载分类失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editingCategory) {
        // 编辑模式
        res = await productAPI.updateCategory(editingCategory.id, formData);
        if (res.code === 200) {
          // 先更新前端列表，提供即时反馈
          setCategories(prev => prev.map(cat => 
            cat.id === editingCategory.id ? { ...cat, ...formData } : cat
          ));
        }
      } else {
        // 添加模式
        res = await productAPI.createCategory(formData);
        if (res.code === 200) {
          // 先添加到前端列表，提供即时反馈
          const newCategory = {
            id: res.data.id,
            ...formData,
            created_at: new Date().toISOString(),
            product_count: 0
          };
          setCategories(prev => [...prev, newCategory]);
        }
      }
      if (res.code === 200) {
        setShowModal(false);
        resetForm();
        // 清除缓存
        requestCache.clearByPrefix('/products/categories');
        // 重新加载分类，确保数据一致性
        await loadCategories();
        console.log(editingCategory ? '分类修改成功' : '分类添加成功');
      }
    } catch (error) {
      console.error('操作分类错误:', error);
      alert(editingCategory ? '修改失败' : '添加失败');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon || '',
      sort_order: category.sort_order !== undefined ? category.sort_order : 0
    });
    setShowModal(true);
  };

  const handleDelete = async (category) => {
    if (!confirm(`确定要删除分类 "${category.name}" 吗？`)) {
      return;
    }
    try {
      // 先从前端列表中移除该分类，提供即时反馈
      setCategories(prev => prev.filter(cat => cat.id !== category.id));
      
      const res = await productAPI.deleteCategory(category.id);
      if (res.code === 200) {
        // 清除缓存
        requestCache.clearByPrefix('/products/categories');
        // 重新加载分类，确保数据一致性
        await loadCategories();
        console.log('分类删除成功，已重新加载分类列表');
      } else {
        // 如果删除失败，恢复分类列表
        await loadCategories();
        alert(res.message || '删除失败');
      }
    } catch (error) {
      // 如果发生错误，恢复分类列表
      await loadCategories();
      console.error('删除分类错误:', error);
      alert('删除失败：' + (error.message || '未知错误'));
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({ name: '', icon: '', sort_order: 0 });
  };
  
  // 加载商品列表
  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await productAPI.list();
      if (res.code === 200) {
        setProducts(res.data);
      }
    } catch (error) {
      console.error('加载商品失败:', error);
    } finally {
      setLoadingProducts(false);
    }
  };
  
  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      // 取消全选
      setSelectedProducts(new Set());
    } else {
      // 全选
      const allProductIds = new Set(products.map(product => product.id));
      setSelectedProducts(allProductIds);
    }
  };
  
  // 处理批量设置
  const handleBatchSet = async () => {
    if (selectedProducts.size === 0) {
      alert('请选择要设置的商品');
      return;
    }
    
    if (!confirm(`确定要将选中的 ${selectedProducts.size} 个商品设置为分类 "${selectedCategory.name}" 吗？`)) {
      return;
    }
    
    try {
      setIsBatchSetting(true);
      const productIds = Array.from(selectedProducts);
      let successCount = 0;
      let errorCount = 0;
      
      // 逐个更新商品分类，记录成功和失败的数量
      for (const productId of productIds) {
        try {
          await productAPI.update(productId, { category_id: selectedCategory.id });
          successCount++;
        } catch (err) {
          console.error(`更新商品 ${productId} 失败:`, err);
          errorCount++;
        }
      }
      
      // 清除缓存
      requestCache.clearByPrefix('/products');
      requestCache.clearByPrefix('/products/categories');
      
      // 重新加载分类，确保商品数更新
      await loadCategories();
      
      // 关闭弹窗并重置状态
      setShowBatchSetModal(false);
      setSelectedCategory(null);
      setSelectedProducts(new Set());
      setIsBatchSetting(false);
      
      // 显示详细的操作结果
      if (errorCount === 0) {
        alert(`成功将 ${successCount} 个商品设置为分类 "${selectedCategory.name}"`);
      } else {
        alert(`批量设置完成：成功 ${successCount} 个，失败 ${errorCount} 个`);
      }
    } catch (error) {
      console.error('批量设置失败:', error);
      setIsBatchSetting(false);
      alert('批量设置失败：' + (error.message || '未知错误'));
    }
  };
  
  // 打开批量设置弹窗
  const openBatchSetModal = (category) => {
    setSelectedCategory(category);
    setSelectedProducts(new Set());
    loadProducts();
    setShowBatchSetModal(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">分类管理</h1>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          添加分类
        </button>
      </div>

      {/* 分类列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">排序</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">分类</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">商品数</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">加载中...</td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">暂无分类</td>
              </tr>
            ) : (
              categories.map((cat, index) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                      {cat.sort_order || index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-3xl">{cat.icon}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">{cat.name}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {cat.product_count || 0} 个商品
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(cat)}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => openBatchSetModal(cat)}
                        className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors"
                      >
                        批量设置
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        disabled={cat.product_count > 0}
                        title={cat.product_count > 0 ? '该分类下有商品，无法删除' : ''}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 预设分类说明 */}
      <div className="mt-6 bg-blue-50 rounded-xl p-4">
        <h3 className="font-medium text-blue-800 mb-2">预设分类</h3>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span>🥚</span>
            <span>禽蛋类</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🥬</span>
            <span>蔬菜类</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🥦</span>
            <span>进口蔬菜</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🍎</span>
            <span>水果类</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🥩</span>
            <span>肉类</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🐟</span>
            <span>水产类</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🧂</span>
            <span>调料干货</span>
          </div>
        </div>
      </div>

      {/* 添加/编辑分类弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md m-4">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingCategory ? '编辑分类' : '添加分类'}</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">分类名称 *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  placeholder="如：蔬菜类"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">图标 (Emoji)</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  placeholder="🥬"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">排序</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 py-2 border border-gray-300 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 批量设置弹窗 */}
      {showBatchSetModal && selectedCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl m-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">批量设置商品分类为：{selectedCategory.name}</h3>
              <button onClick={() => {
                setShowBatchSetModal(false);
                setSelectedCategory(null);
                setSelectedProducts(new Set());
              }} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingProducts ? (
                <div className="flex justify-center items-center h-32">
                  <span className="text-gray-400">加载商品中...</span>
                </div>
              ) : products.length === 0 ? (
                <div className="flex justify-center items-center h-32">
                  <span className="text-gray-400">暂无商品</span>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {selectedProducts.size === products.length ? '取消全选' : '全选'}
                    </button>
                    <span className="text-sm text-gray-600">
                      共 {products.length} 个商品
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className={`border rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                          selectedProducts.has(product.id)
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          const newSelected = new Set(selectedProducts);
                          if (newSelected.has(product.id)) {
                            newSelected.delete(product.id);
                          } else {
                            newSelected.add(product.id);
                          }
                          setSelectedProducts(newSelected);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => {}}
                          className="w-4 h-4 text-green-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            当前分类：{product.category_name || '未分类'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                已选择 {selectedProducts.size} 个商品
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowBatchSetModal(false);
                    setSelectedCategory(null);
                    setSelectedProducts(new Set());
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                  disabled={isBatchSetting}
                >
                  取消
                </button>
                <button
                  onClick={handleBatchSet}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  disabled={isBatchSetting || selectedProducts.size === 0}
                >
                  {isBatchSetting ? '设置中...' : '确定设置'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
