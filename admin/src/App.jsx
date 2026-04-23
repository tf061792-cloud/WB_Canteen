import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAdminStore } from './stores/adminStore';
import Login from './views/Login';
import Layout from './views/Layout';

// 核心页面直接导入
import Dashboard from './views/Dashboard';
import OrderList from './views/OrderList';
import ProductManage from './views/ProductManage';

// 懒加载次要页面
const CategoryList = lazy(() => import('./views/CategoryList'));
const CustomerList = lazy(() => import('./views/CustomerList'));
const AdminUserList = lazy(() => import('./views/AdminUserList'));
const DistributionManage = lazy(() => import('./views/DistributionManage'));
const PermissionManage = lazy(() => import('./views/PermissionManage'));
const BannerManage = lazy(() => import('./views/BannerManage'));
const SiteInfo = lazy(() => import('./views/SiteInfo'));
const FinanceAnalysis = lazy(() => import('./views/FinanceAnalysis'));

// 页面加载占位符
function PageLoader() {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
      <div className="space-y-3">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

// 受保护的路由（最简单）
function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAdminStore();
  
  const location = useLocation();
  console.log('� 当前路径:', location.pathname);
  console.log('🔐 isLoggedIn:', isLoggedIn);
  
  // 如果未登录且不在登录页，才跳转
  if (!isLoggedIn && location.pathname !== '/login') {
    console.log('🔄 未登录，跳转到 /login');
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* 登录页面不需要保护 */}
        <Route path="/login" element={<Login />} />
        
        {/* 其他所有页面都需要保护 */}
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route index element={<Dashboard />} />
                <Route path="orders" element={<OrderList />} />
                <Route path="products" element={<ProductManage />} />
                <Route path="categories" element={<CategoryList />} />
                <Route path="customers" element={<CustomerList />} />
                <Route path="admin-users" element={<AdminUserList />} />
                <Route path="distribution" element={<DistributionManage />} />
                <Route path="pricing" element={<ProductManage />} />
                <Route path="permissions" element={<PermissionManage />} />
                <Route path="banners" element={<BannerManage />} />
                <Route path="site-info" element={<SiteInfo />} />
                <Route path="finance" element={<FinanceAnalysis />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
  );
}
