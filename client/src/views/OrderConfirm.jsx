import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { useUserStore } from '../stores/userStore';
import { orderAPI, addressAPI } from '../api/index';

export default function OrderConfirm() {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { isLoggedIn } = useUserStore();
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn) {
      setError('请先登录后再下单');
      return;
    }
    fetchDefaultAddress();
  }, [isLoggedIn]);

  const fetchDefaultAddress = async () => {
    try {
      const res = await addressAPI.list();
      if (res.code === 200) {
        const addresses = res.data || [];
        const defaultAddr = addresses.find(addr => addr.is_default === 1) || addresses[0];
        if (defaultAddr) {
          setAddress(defaultAddr.address || '');
          setContact(defaultAddr.name || '');
          setPhone(defaultAddr.phone || '');
        }
      }
    } catch (error) {
      console.error('获取收货地址失败:', error);
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!isLoggedIn) {
      if (confirm('请先登录后再下单，是否跳转到登录页面？')) {
        navigate('/login');
      }
      return;
    }

    if (!address.trim()) {
      setError('请输入收货地址');
      return;
    }
    if (!contact.trim()) {
      setError('请输入联系人');
      return;
    }
    if (!phone.trim()) {
      setError('请输入联系电话');
      return;
    }

    try {
      setLoading(true);
      
      const orderData = {
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        })),
        address,
        contact,
        phone,
        remark
      };

      const res = await orderAPI.create(orderData);
      
      if (res.code === 200) {
        clearCart();
        navigate(`/order/detail/${res.data.order_id}`);
      } else {
        setError(res.message || '创建订单失败');
      }
    } catch (err) {
      if (err.message?.includes('登录') || err.message?.includes('请先')) {
        setError('请先登录后再下单');
      } else {
        setError(err.message || '创建订单失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* 顶部 */}
      <div className="bg-white p-4 flex items-center justify-between sticky top-0 z-10">
        <Link to="/cart" className="text-2xl">←</Link>
        <h1 className="text-lg font-medium">确认订单</h1>
        <div className="w-8"></div>
      </div>

      {/* 收货信息 */}
      <div className="bg-white mt-3 p-4">
        <h2 className="font-medium text-gray-800 mb-3">收货信息</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-500 mb-1">收货地址</label>
            <input
              type="text"
              placeholder="请输入详细收货地址"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-500 mb-1">联系人</label>
              <input
                type="text"
                placeholder="姓名"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">电话</label>
              <input
                type="tel"
                placeholder="手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 商品清单 */}
      <div className="bg-white mt-3 p-4">
        <h2 className="font-medium text-gray-800 mb-3">商品清单</h2>
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.product_id} className="border-b border-gray-100 pb-3 last:border-0">
              {/* 商品基本信息 */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const svg = `<svg width="56" height="56" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f5f5f5"/><text x="50%" y="50%" font-family="Arial" font-size="10" text-anchor="middle" dominant-baseline="middle" fill="#999">暂无</text></svg>`;
                      e.target.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{item.name}</h3>
                  <p className="text-sm text-gray-400">{item.specs || item.unit}</p>
                </div>
              </div>
              {/* 价格明细 */}
              <div className="flex justify-between items-center text-sm pl-[68px]">
                <div className="flex gap-4 text-gray-500">
                  <span>单价: <span className="text-gray-800">฿{Number(item.price).toFixed(2)}</span></span>
                  <span>数量: <span className="text-gray-800">x{item.quantity}</span></span>
                </div>
                <div className="text-orange-500 font-bold">
                  小计: ฿{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* 合计 */}
        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">共 {items.length} 件商品</span>
            <span className="text-lg font-bold text-orange-500">
              合计: ฿{getTotalPrice().toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 备注 */}
      <div className="bg-white mt-3 p-4">
        <h2 className="font-medium text-gray-800 mb-3">备注</h2>
        <textarea
          placeholder="如有特殊要求请备注..."
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 resize-none"
          rows="2"
        />
      </div>

      {error && (
        <div className="mx-3 mt-3 p-3 bg-red-50 text-red-500 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* 底部结算 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 p-4 flex items-center gap-4">
        <div className="flex-1">
          <span className="text-gray-500">合计：</span>
          <span className="text-orange-500 font-bold text-xl">
            ฿{getTotalPrice().toFixed(2)}
          </span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`px-6 py-3 rounded-lg font-medium disabled:bg-gray-300 ${
            isLoggedIn 
              ? 'bg-orange-500 text-white' 
              : 'bg-gray-500 text-white'
          }`}
        >
          {loading ? '提交中...' : (isLoggedIn ? '提交订单' : '请先登录')}
        </button>
      </div>
    </div>
  );
}