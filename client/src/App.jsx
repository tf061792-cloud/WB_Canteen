import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useUserStore } from './stores/userStore';
import Home from './views/Home';
import Login from './views/Login';

// 懒加载页面组件
const Cart = lazy(() => import('./views/Cart'));
const OrderConfirm = lazy(() => import('./views/OrderConfirm'));
const OrderList = lazy(() => import('./views/OrderList'));
const OrderDetail = lazy(() => import('./views/OrderDetail'));
const Register = lazy(() => import('./views/Register'));
const UserCenter = lazy(() => import('./views/UserCenter'));
const CustomerManage = lazy(() => import('./views/CustomerManage'));
const OrderExport = lazy(() => import('./views/OrderExport'));
const AddressManage = lazy(() => import('./views/AddressManage'));

// 页面加载占位符
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

// 受保护的路由
function ProtectedRoute({ children }) {
  const { isLoggedIn } = useUserStore();
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

export default function App() {
  return (
    <>
      <div className="page-container">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* 公开路由 */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Home />} />
            <Route path="/category/:id" element={<Home />} />
            <Route path="/product/:id" element={<Home />} />
            
            {/* 需要登录的路由 */}
            <Route path="/cart" element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            } />
            <Route path="/order/confirm" element={
              <ProtectedRoute>
                <OrderConfirm />
              </ProtectedRoute>
            } />
            <Route path="/order/list" element={
              <ProtectedRoute>
                <OrderList />
              </ProtectedRoute>
            } />
            <Route path="/order/detail/:id" element={
              <ProtectedRoute>
                <OrderDetail />
              </ProtectedRoute>
            } />
            <Route path="/user" element={
              <ProtectedRoute>
                <UserCenter />
              </ProtectedRoute>
            } />
            <Route path="/customers" element={
              <ProtectedRoute>
                <CustomerManage />
              </ProtectedRoute>
            } />
            <Route path="/order/export" element={
              <ProtectedRoute>
                <OrderExport />
              </ProtectedRoute>
            } />
            <Route path="/addresses" element={
              <ProtectedRoute>
                <AddressManage />
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </div>
    </>
  );
}
