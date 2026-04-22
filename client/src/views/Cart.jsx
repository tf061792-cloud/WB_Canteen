import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';

export default function Cart() {
  const { items, updateQuantity, removeItem, clearCart, getTotalPrice } = useCartStore();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (items.length === 0) return;
    navigate('/order/confirm');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* 顶部 */}
        <div className="bg-white p-4 flex items-center justify-between sticky top-0 z-10">
          <Link to="/" className="text-2xl">←</Link>
          <h1 className="text-lg font-medium">购物车</h1>
          <div className="w-8"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-6xl mb-4">🛒</div>
          <p className="text-gray-500 mb-4">购物车是空的</p>
          <Link
            to="/"
            className="px-6 py-2 bg-orange-500 text-white rounded-lg"
          >
            去逛逛
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部 */}
      <div className="bg-white p-4 flex items-center justify-between sticky top-0 z-10">
        <Link to="/" className="text-2xl">←</Link>
        <h1 className="text-lg font-medium">购物车</h1>
        <button
          onClick={clearCart}
          className="text-orange-500 text-sm"
        >
          清空
        </button>
      </div>

      {/* 商品列表 */}
      <div className="p-2 space-y-2">
        {items.map(item => (
          <div key={item.product_id} className="bg-white rounded-lg p-2 flex gap-2">
            <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-14 h-14 object-cover"
                onError={(e) => {
                  // 使用本地 SVG 占位图片
                  const svg = `<svg width="56" height="56" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f5f5f5"/><text x="50%" y="50%" font-family="Arial" font-size="10" text-anchor="middle" dominant-baseline="middle" fill="#999">暂无</text></svg>`;
                  e.target.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
                }}
              />
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-medium text-gray-800 text-sm truncate">{item.name}</h3>
                <p className="text-xs text-gray-400">{item.specs || item.unit}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-orange-500 font-bold text-sm">
                  ฿{Number(item.price).toFixed(2)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                    className="w-5 h-5 border border-gray-200 rounded flex items-center justify-center text-xs"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={item.quantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*$/.test(value)) {
                        const num = parseInt(value) || 0;
                        if (num >= 0) {
                          updateQuantity(item.product_id, num);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const num = parseInt(e.target.value) || 1;
                      updateQuantity(item.product_id, Math.max(1, num));
                    }}
                    className="w-7 h-5 text-center border border-gray-200 rounded text-xs focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                    className="w-5 h-5 border border-gray-200 rounded flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => removeItem(item.product_id)}
              className="text-gray-400 self-start text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* 底部结算栏 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 p-4 flex items-center gap-4">
        <div className="flex-1">
          <span className="text-gray-500">合计：</span>
          <span className="text-orange-500 font-bold text-xl">
            ฿{getTotalPrice().toFixed(2)}
          </span>
        </div>
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium disabled:bg-gray-300"
        >
          去结算({items.length})
        </button>
      </div>
    </div>
  );
}
