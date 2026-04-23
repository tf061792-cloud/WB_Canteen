import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../stores/adminStore';
import LanguageSelector from '../components/LanguageSelector';

// 菜单配置（使用翻译键）
const menuItems = [
  { path: '/', icon: '📊', labelKey: 'menu.dashboard' },
  { path: '/orders', icon: '📋', labelKey: 'menu.orders' },
  { path: '/products', icon: '📦', labelKey: 'menu.products' },
  { path: '/categories', icon: '🏷️', labelKey: 'menu.categories' },
  { path: '/customers', icon: '👥', labelKey: 'menu.customers' },
  { path: '/finance', icon: '💰', labelKey: 'menu.finance' },
  { path: '/distribution', icon: '🤝', labelKey: 'menu.distribution' },
  { path: '/admin-users', icon: '🔐', labelKey: 'menu.adminUsers' },
  { path: '/permissions', icon: '🛡️', labelKey: 'menu.permissions' },
  { path: '/banners', icon: '🖼️', labelKey: 'menu.banners' },
  { path: '/site-info', icon: '⚙️', labelKey: 'menu.siteInfo' }
];

export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { admin, logout } = useAdminStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    if (confirm(t('common.confirmLogout'))) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* 侧边栏 */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white shadow-lg transition-all duration-300 flex flex-col sticky top-0 h-screen`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-100">
          <div className="text-2xl mr-2">🍽️</div>
          {sidebarOpen && <span className="font-bold text-gray-800">{t('common.appName')}</span>}
        </div>

        {/* 菜单 */}
        <nav className="flex-1 py-4">
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-6 py-3 mx-2 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-orange-50 text-orange-500'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl mr-3">{item.icon}</span>
              {sidebarOpen && <span>{t(item.labelKey)}</span>}
            </Link>
          ))}
        </nav>

        {/* 底部用户信息 */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-medium mr-3">
              {admin?.nickname?.charAt(0) || 'A'}
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <p className="font-medium text-gray-800 text-sm">{admin?.nickname}</p>
                <p className="text-xs text-gray-500">{admin?.role || t('menu.adminUsers')}</p>
              </div>
            )}
            {sidebarOpen && (
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-500">
                🚪
              </button>
            )}
          </div>
        </div>

        {/* 收起按钮 */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-20 -right-3 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 shadow"
        >
          {sidebarOpen ? '‹' : '›'}
        </button>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col">
        {/* 顶部栏（添加语言选择器） */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-end">
          <LanguageSelector />
        </div>
        
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
