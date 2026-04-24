import { useState, useEffect } from 'react';
import { bannerAPI } from '../api/index';

export default function BannerManage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [form, setForm] = useState({
    title: '',
    image: '',
    link: '',
    position: 'home',
    sort_order: 0,
    status: 'active'
  });

  // 处理图片上传
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await bannerAPI.upload(file);

      if (res.code === 200) {
        setForm({ ...form, image: res.data.url });
        setFormErrors(prev => ({ ...prev, image: '' }));
      } else {
        alert('上传失败: ' + (res.message || '未知错误'));
      }
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败: ' + (error.message || '网络错误'));
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await bannerAPI.list();
      if (res.code === 200) {
        setBanners(res.data.list || res.data || []);
      }
    } catch (error) {
      console.error('获取轮播图失败:', error);
    }
    setLoading(false);
  };

  // 表单验证
  const validateForm = () => {
    const errors = {};
    if (!form.title || form.title.trim() === '') {
      errors.title = '标题不能为空';
    }
    if (!form.image || form.image.trim() === '') {
      errors.image = '请上传图片';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 前端验证
    if (!validateForm()) {
      return;
    }

    try {
      let res;
      if (editingBanner) {
        res = await bannerAPI.update(editingBanner.id, form);
      } else {
        res = await bannerAPI.create(form);
      }
      
      if (res.code === 200) {
        alert(editingBanner ? '更新成功' : '添加成功');
        setModalOpen(false);
        setEditingBanner(null);
        setForm({ title: '', image: '', link: '', position: 'home', sort_order: 0, status: 'active' });
        setFormErrors({});
        fetchBanners();
      } else {
        alert('保存失败: ' + (res.message || '未知错误'));
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败: ' + (error.message || '网络错误'));
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title || '',
      image: banner.image || '',
      link: banner.link || '',
      position: banner.position || 'home',
      sort_order: banner.sort_order || 0,
      status: banner.status || 'active'
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingBanner(null);
    setForm({ title: '', image: '', link: '', position: 'home', sort_order: 0, status: 'active' });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个轮播图吗？')) return;
    
    try {
      const res = await bannerAPI.delete(id);
      if (res.code === 200) {
        alert('删除成功');
        fetchBanners();
      } else {
        alert('删除失败: ' + (res.message || '未知错误'));
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败: ' + (error.message || '网络错误'));
    }
  };

  const handleToggleStatus = async (banner) => {
    const newStatus = banner.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await bannerAPI.update(banner.id, { ...banner, status: newStatus });
      if (res.code === 200) {
        fetchBanners();
      } else {
        alert('状态更新失败: ' + (res.message || '未知错误'));
      }
    } catch (error) {
      console.error('状态更新失败:', error);
      alert('状态更新失败: ' + (error.message || '网络错误'));
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">轮播图管理</h1>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 添加轮播图
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">加载中...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">图片</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">位置</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">排序</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {banners.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                    暂无轮播图数据
                  </td>
                </tr>
              ) : (
                banners.map((banner) => (
                  <tr key={banner.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{banner.id}</td>
                    <td className="px-6 py-4">
                      {banner.image ? (
                        <img
                          src={banner.image}
                          alt={banner.title}
                          className="w-20 h-12 object-cover rounded"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="48"><rect width="80" height="48" fill="%23f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="10">无图</text></svg>';
                          }}
                        />
                      ) : (
                        <div className="w-20 h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                          无图
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{banner.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{banner.position}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{banner.sort_order}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(banner)}
                        className={`px-2 py-1 text-xs rounded-full ${
                          banner.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {banner.status === 'active' ? '启用' : '禁用'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleEdit(banner)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
                        className="text-red-600 hover:text-red-800"
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
      )}

      {/* 添加/编辑弹窗 */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {editingBanner ? '编辑轮播图' : '添加轮播图'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    setForm({ ...form, title: e.target.value });
                    if (formErrors.title) {
                      setFormErrors({ ...formErrors, title: '' });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    formErrors.title
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:ring-blue-200'
                  }`}
                  placeholder="请输入标题"
                />
                {formErrors.title && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  图片 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="banner-image"
                  />
                  <label
                    htmlFor="banner-image"
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                  >
                    {uploading ? '上传中...' : '选择图片'}
                  </label>
                  {form.image && (
                    <div className="relative">
                      <img
                        src={form.image}
                        alt="预览"
                        className="w-20 h-12 object-cover rounded border"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="48"><rect width="80" height="48" fill="%23f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="10">预览</text></svg>';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, image: '' })}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                {formErrors.image && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.image}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">链接</label>
                <input
                  type="text"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="请输入链接（可选）"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">位置</label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="home">首页</option>
                    <option value="category">分类页</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="active">启用</option>
                  <option value="inactive">禁用</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setFormErrors({});
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {editingBanner ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
