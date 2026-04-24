import { useState, useEffect } from 'react';
import { productAPI } from '../api/index';

  // 处理图片URL - 本地图片特殊处理
  const getImageUrl = (url) => {
    if (!url) return '';
    // 本地图片需要加上完整的API前缀
    if (url.startsWith('/uploads/')) {
      const API_BASE_URL = import.meta.env?.VITE_API_URL || 'https://wbcanteen-production.up.railway.app';
      return `${API_BASE_URL}${url}`;
    }
    return url;
  };

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50; // 每页显示50条记录
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    price: '',
    unit: '斤',
    specs: '',
    stock: 0,
    image: '',
    description: '',
    status: 'active'
  });

  useEffect(() => {
    loadData(page);
  }, [page]);

  const loadData = async (currentPage = page) => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        productAPI.list({ page: currentPage, pageSize }),
        productAPI.categories()
      ]);
      if (prodRes.code === 200) {
        setProducts(prodRes.data.list || prodRes.data);
        setTotal(prodRes.data.total || 0);
      }
      if (catRes.code === 200) setCategories(catRes.data);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productAPI.update(editingProduct.id, formData);
      } else {
        await productAPI.create(formData);
      }
      setShowModal(false);
      resetForm();
      loadData(page);
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category_id: product.category_id || '',
      price: product.price,
      unit: product.unit,
      specs: product.specs || '',
      stock: product.stock,
      image: product.image || '',
      description: product.description || '',
      status: product.status
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个商品吗？')) return;
    try {
      await productAPI.delete(id);
      loadData(page);
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleToggleStatus = async (product) => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    try {
      await productAPI.update(product.id, { status: newStatus });
      loadData(page);
    } catch (error) {
      alert('更新失败');
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category_id: '',
      price: '',
      unit: '斤',
      specs: '',
      stock: 0,
      image: '',
      description: '',
      status: 'active'
    });
  };

  const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id);
    return cat ? `${cat.icon || ''} ${cat.name}` : '-';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">商品管理</h1>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          添加商品
        </button>
      </div>

      {/* 商品列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">商品</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">分类</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">价格</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">库存</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">状态</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-gray-400">加载中...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-gray-400">暂无商品</td>
              </tr>
            ) : (
              products.map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-3 py-1">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden mr-2 flex-shrink-0">
                        <img
                          src={getImageUrl(product.image)}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/32x32/f5f5f5/999?text=暂无';
                          }}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.specs}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-1 text-xs">
                    {getCategoryName(product.category_id)}
                  </td>
                  <td className="px-3 py-1">
                    <span className="text-orange-500 font-medium">
                      ¥{Number(product.price).toFixed(2)}/{product.unit}
                    </span>
                  </td>
                  <td className="px-3 py-1 text-xs">
                    <span className={product.stock < 10 ? 'text-red-500' : 'text-gray-600'}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-3 py-1">
                    <button
                      onClick={() => handleToggleStatus(product)}
                      className={`px-2 py-0.5 rounded text-xs ${
                        product.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {product.status === 'active' ? '上架' : '下架'}
                    </button>
                  </td>
                  <td className="px-3 py-1">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-orange-500 hover:text-orange-600 text-xs mr-2"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-500 hover:text-red-600 text-xs"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {total > pageSize && (
        <div className="flex justify-center items-center gap-2 py-2 bg-white border-t border-gray-200">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border border-gray-200 rounded disabled:bg-gray-100 disabled:text-gray-400 hover:bg-gray-50"
          >
            上一页
          </button>
          <span className="text-sm text-gray-600">
            第 {page} 页 / 共 {Math.ceil(total / pageSize)} 页 (共 {total} 条)
          </span>
          <button
            onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
            disabled={page >= Math.ceil(total / pageSize)}
            className="px-3 py-1 text-sm border border-gray-200 rounded disabled:bg-gray-100 disabled:text-gray-400 hover:bg-gray-50"
          >
            下一页
          </button>
        </div>
      )}

      {/* 添加/编辑商品弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto m-4">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg">
                {editingProduct ? '编辑商品' : '添加商品'}
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">商品名称 *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">分类</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  >
                    <option value="">请选择分类</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">价格 *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">单位</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                    placeholder="如：斤、盒、份"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">库存</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">规格</label>
                <input
                  type="text"
                  value={formData.specs}
                  onChange={(e) => setFormData({ ...formData, specs: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  placeholder="如：500g/盒"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">图片URL</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 resize-none"
                  rows="2"
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
    </div>
  );
}
