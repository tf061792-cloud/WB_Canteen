import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../stores/adminStore';
import LanguageSelector from '../components/LanguageSelector';

// 权限配置（价格管理已合并到商品管理，但仍保留/pricing路由访问权限）
const ROLE_PERMISSIONS = {
  // 最高管理员：全部权限
  superadmin: {
    roleKey: 'superadmin',
    routes: ['/', '/orders', '/products', '/categories', '/pricing', '/customers', '/distribution', '/admin-users', '/permissions', '/banners', '/finance']
  },
  // 运营：数据统计分析、操作员账户新增管理、客户管理、商品管理、分类管理、订单管理
  operation: {
    roleKey: 'operation',
    routes: ['/', '/orders', '/products', '/categories', '/customers', '/admin-users', '/finance']
  },
  // 财务：数据统计分析、利润加权修改、成本价修改、订单管理、分销管理、商品管理、价格管理
  finance: {
    roleKey: 'finance',
    routes: ['/', '/orders', '/pricing', '/products', '/distribution', '/customers', '/finance']
  },
  // 操作员：成本价修改、客户审核、订单管理
  operator: {
    roleKey: 'operator',
    routes: ['/pricing', '/customers', '/orders', '/finance']
  },
  // 配货员
  picker: {
    roleKey: 'picker',
    routes: ['/orders']
  }
};

const getMenuItems = (t) => [
  { path: '/', icon: '📊', label: t('menu.dashboard') },
  { path: '/orders', icon: '📋', label: t('menu.orders') },
  { path: '/products', icon: '📦', label: t('menu.products') },
  { path: '/categories', icon: '🏷️', label: t('menu.categories') },
  { path: '/customers', icon: '👥', label: t('menu.customers') },
  { path: '/finance', icon: '💰', label: '财务分析' },
  { path: '/distribution', icon: '🤝', label: t('menu.distribution') },
  { path: '/admin-users', icon: '🔐', label: t('menu.adminUsers') },
  { path: '/permissions', icon: '🛡️', label: t('menu.permissions') },
  { path: '/banners', icon: '🖼️', label: t('menu.banners') },
  { path: '/site-info', icon: '⚙️', label: t('menu.siteInfo') }
];

// 添加空权限的fallback（必须在push之前）
if (!ROLE_PERMISSIONS.staff) {
  ROLE_PERMISSIONS.staff = {
    roleKey: 'staff',
    routes: ['/', '/orders', '/site-info', '/finance']
  };
}

// 更新权限配置，添加网站信息权限
ROLE_PERMISSIONS.superadmin.routes.push('/site-info');
ROLE_PERMISSIONS.operation.routes.push('/site-info');
ROLE_PERMISSIONS.finance.routes.push('/site-info');
ROLE_PERMISSIONS.operator.routes.push('/site-info');
ROLE_PERMISSIONS.picker.routes.push('/site-info');
if (ROLE_PERMISSIONS.staff) {
  ROLE_PERMISSIONS.staff.routes.push('/site-info');
}

export default function Layout() {
  const location = useLocation();
  const { admin, logout } = useAdminStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 获取当前角色权限
  const role = admin?.role || 'staff';
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.staff;

  // 获取带翻译的菜单
  const menuItems = getMenuItems(t);

  // 过滤有权限的菜单
  const allowedMenuItems = menuItems.filter(item => 
    permissions.routes.includes(item.path)
  );

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
          {allowedMenuItems.map(item => (
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
              {sidebarOpen && <span>{item.label}</span>}
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
                <p className="text-xs text-gray-500">{t(`roles.${permissions.roleKey}`)}</p>
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
        {/* 顶部栏 */}
        <header className="bg-white shadow-sm px-6 py-3 flex justify-end items-center">
          <LanguageSelector />
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
