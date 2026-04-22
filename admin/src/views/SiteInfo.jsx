import { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import Toast from '../components/Toast';

export default function SiteInfo() {
  const [siteInfo, setSiteInfo] = useState({
    site_name: '',
    site_logo: '',
    site_description: '',
    contact_phone: '',
    contact_email: '',
    contact_address: '',
    business_hours: '',
    icp: '',
    copyright: '',
    delivery_note: '',
    site_notice: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadSiteInfo();
  }, []);

  const loadSiteInfo = async () => {
    try {
      const res = await adminAPI.get('/site/info');
      if (res.code === 200 && res.data) {
        setSiteInfo(res.data);
      }
    } catch (error) {
      console.error('加载网站信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminAPI.put('/site/info', siteInfo);
      if (res.code === 200) {
        setToast({ type: 'success', message: '网站信息保存成功' });
      } else {
        setToast({ type: 'error', message: res.message || '保存失败' });
      }
    } catch (error) {
      setToast({ type: 'error', message: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSiteInfo(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="text-gray-500">加载中...</span>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">网站基本信息</h1>
        <p className="text-sm text-gray-500">配置网站的基本信息和联系方式</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 网站信息 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">网站信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">网站名称</label>
              <input
                type="text"
                name="site_name"
                value={siteInfo.site_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入网站名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">网站Logo URL</label>
              <input
                type="text"
                name="site_logo"
                value={siteInfo.site_logo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入Logo图片链接"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">网站描述</label>
              <textarea
                name="site_description"
                value={siteInfo.site_description}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入网站描述"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">网站公告</label>
              <textarea
                name="site_notice"
                value={siteInfo.site_notice}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入网站公告（显示在用户端首页）"
              />
            </div>
          </div>
        </div>

        {/* 联系方式 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">联系方式</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
              <input
                type="text"
                name="contact_phone"
                value={siteInfo.contact_phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入联系电话"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">联系邮箱</label>
              <input
                type="email"
                name="contact_email"
                value={siteInfo.contact_email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入联系邮箱"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">联系地址</label>
              <input
                type="text"
                name="contact_address"
                value={siteInfo.contact_address}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入联系地址"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">营业时间</label>
              <input
                type="text"
                name="business_hours"
                value={siteInfo.business_hours}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：周一至周五 9:00-18:00"
              />
            </div>
          </div>
        </div>

        {/* 其他信息 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">其他信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ICP备案号</label>
              <input
                type="text"
                name="icp"
                value={siteInfo.icp}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入ICP备案号"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">版权信息</label>
              <input
                type="text"
                name="copyright"
                value={siteInfo.copyright}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：© 2024 WB食堂 版权所有"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">配送说明</label>
              <textarea
                name="delivery_note"
                value={siteInfo.delivery_note}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入配送说明（显示在订单页面）"
              />
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </form>
    </div>
  );
}
