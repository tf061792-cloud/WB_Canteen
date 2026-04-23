import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect, useState } from 'react';
import { useAdminStore } from './stores/adminStore';
import Login from './views/Login';
import Layout from './views/Layout';

// 核心页面直接导入（避免首屏黑屏）
import Dashboard from './views/Dashboard';
import OrderList from './views/OrderList';
import ProductManage from './views/ProductManage';

// 懒加载次要页面组件
const CategoryList = lazy(() => import('./views/CategoryList'));
const CustomerList = lazy(() => import('./views/CustomerList'));
const AdminUserList = lazy(() => import('./views/AdminUserList'));
const DistributionManage = lazy(() => import('./views/DistributionManage'));
const PermissionManage = lazy(() => import('./views/PermissionManage'));
const BannerManage = lazy(() => import('./views/BannerManage'));
const SiteInfo = lazy(() => import('./views/SiteInfo'));
const FinanceAnalysis = lazy(() => import('./views/FinanceAnalysis'));


// 预加载函数
const prefetchComponents = () => {
  const components = [
    () => import('./views/CategoryList'),
    () => import('./views/CustomerList'),
    () => import('./views/FinanceAnalysis'),
  ];
  components.forEach(comp => comp());
};

// 页面加载占位符 - 使用骨架屏避免黑屏
function PageLoader() {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
      <div className="space-y-3">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

// 受保护的路由
function ProtectedRoute({ children }) {
  const { isLoggedIn, admin, token } = useAdminStore();
  
  // 添加调试日志
  console.log('🔐 ProtectedRoute - isLoggedIn:', isLoggedIn);
  console.log('🔐 ProtectedRoute - admin:', admin);
  console.log('🔐 ProtectedRoute - token:', token);
  
  if (!isLoggedIn) {
    console.log('🔄 未登录，跳转到 /login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('✅ 已登录，允许访问');
  return children;
}



// 路由预加载包装组件
function PrefetchWrapper({ children }) {
  const location = useLocation();
  
  useEffect(() => {
    // 页面加载完成后预加载其他组件
    const timer = setTimeout(prefetchComponents, 1000);
    return () => clearTimeout(timer);
  }, []);
  
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <PrefetchWrapper>
              <Layout />
            </PrefetchWrapper>
          </ProtectedRoute>
        }>
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

        </Route>
      </Routes>
    </Suspense>
  );
}
