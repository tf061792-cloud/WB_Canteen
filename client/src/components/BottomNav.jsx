import { Link, useLocation } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { useUserStore } from '../stores/userStore';

export default function BottomNav() {
  const location = useLocation();
  const { itemCount } = useCartStore();
  const { user } = useUserStore();
  
  const isPromoter = user?.role === 'promoter';
  
  const navItems = [
    { path: '/', icon: '🏠', label: '首页' },
    { path: '/cart', icon: '🛒', label: '购物车', showBadge: true },
    { path: '/order/list', icon: '📋', label: '订单' },
    ...(isPromoter ? [{ path: '/customers', icon: '👥', label: '客户' }] : []),
    { path: '/user', icon: '👤', label: '我的' }
  ];
  
  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-[480px] mx-auto flex">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 py-3 flex flex-col items-center transition-colors ${
                location.pathname === item.path
                  ? 'text-orange-500'
                  : 'text-gray-500'
              }`}
            >
              <span className={`text-lg ${item.showBadge && itemCount > 0 ? 'relative' : ''}`}>
                {item.icon}
                {item.showBadge && itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </span>
              <span className="text-xs mt-0.5">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      <div className="h-16"></div>
    </>
  );
}
