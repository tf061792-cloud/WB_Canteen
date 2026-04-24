import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productAPI, bannerAPI } from '../api/index';
import { useCartStore } from '../stores/cartStore';
import { useUserStore } from '../stores/userStore';
import PlaceholderImage from '../components/PlaceholderImage';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { addItem, totalCount } = useCartStore();
  const { isLoggedIn, user } = useUserStore();
  const navigate = useNavigate();
  const categoryRefs = useRef({});
  const searchInputRef = useRef(null);

  const userRole = user?.role || 'operator';
  const isOperator = userRole === 'operator';
  const isUser = userRole === 'user';
  const isPromoter = userRole === 'promoter';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    console.log('[DEBUG] Banners updated:', banners);
  }, [banners]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [catRes, prodRes, bannerRes] = await Promise.all([
        productAPI.getCategories(),
        productAPI.getProducts(),
        bannerAPI.getBanners()
      ]);

      if (catRes.code === 200) {
        setCategories(catRes.data);
        if (catRes.data.length > 0) {
          setActiveCategory(catRes.data[0].id);
        }
      }
      if (prodRes.code === 200) {
        setProducts(prodRes.data);
      }
      if (bannerRes.code === 200) {
        console.log('[DEBUG] Banners loaded:', bannerRes.data);
        setBanners(bannerRes.data);
      } else {
        console.error('[DEBUG] Banner API error:', bannerRes);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCart = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
  };

  const scrollToCategory = (categoryId) => {
    setActiveCategory(categoryId);
    const element = categoryRefs.current[categoryId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const filteredProducts = searchQuery
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.name_th && p.name_th.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : products;

  const productsByCategory = categories.map(cat => ({
    ...cat,
    products: filteredProducts
      .filter(p => p.category_id === cat.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { sensitivity: 'base' }))
  })).filter(cat => cat.products.length > 0);

  const searchResults = searchQuery ? filteredProducts : [];

  // 处理图片URL - 本地图片特殊处理，外部图片处理CORS问题
  const getImageUrl = (url) => {
    if (!url) return '';
    // 本地图片直接返回
    if (url.startsWith('/uploads/') || url.startsWith('/api/')) return url;
    
    // 处理 Google Drive 图片的 CORS 问题
    if (url.includes('drive.google.com/uc?export=view&id=')) {
      // 提取文件ID
      const match = url.match(/id=([^&]+)/);
      if (match && match[1]) {
        // 使用 Googleusercontent 格式
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
      }
    }
    
    // 其他外部图片直接返回
    return url;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white shadow-sm z-50">
        <div className="flex items-center px-3 py-2">
          <Link to="/user" className="w-10 h-10 flex items-center justify-center">
            {isLoggedIn ? (
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium">
                {user?.nickname?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </div>
            ) : (
              <span className="text-gray-500 text-sm">登录</span>
            )}
          </Link>
          <div className="flex-1 mx-3">
            <div className="bg-gray-100 rounded-full px-3 py-1.5 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearching(true)}
                onBlur={() => {
                  if (!searchQuery) setIsSearching(false);
                }}
                placeholder="搜索食材名称..."
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearching(false);
                    searchInputRef.current?.blur();
                  }}
                  className="w-5 h-5 flex items-center justify-center text-gray-400"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <Link to="/cart" className="relative w-10 h-10 flex items-center justify-center">
            <span className="text-xl">🛒</span>
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                {totalCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {banners.length > 0 && (
        <div className="bg-white px-3 py-2">
          <div className="relative h-28 rounded-xl overflow-hidden">
            <div className="flex transition-transform duration-500" style={{ width: `${banners.length * 100}%` }}>
              {banners.map((banner) => (
                <div key={banner.id} className="w-full h-28" style={{ width: `${100 / banners.length}%` }}>
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      console.error('[DEBUG] Banner image load error:', banner.image);
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {banners.map((_, index) => (
                <div key={index} className={`w-1.5 h-1.5 rounded-full ${index === 0 ? 'bg-white' : 'bg-white/50'}`} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[60px] bg-gray-100 overflow-y-auto flex-shrink-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              className={`w-full py-2 px-0.5 text-[10px] text-center border-l-[2px] transition-all ${
                activeCategory === cat.id
                  ? 'bg-white border-orange-500 text-orange-500 font-medium'
                  : 'border-transparent text-gray-600'
              }`}
            >
              <div className="text-base mb-0">{cat.icon}</div>
              <div className="leading-none scale-90 whitespace-nowrap overflow-hidden">{cat.name}</div>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          {loading ? (
            <div className="text-center py-10 text-gray-400">加载中...</div>
          ) : searchQuery ? (
            <div className="divide-y divide-gray-100">
              <div className="px-2 py-1 bg-gray-50 sticky top-0 z-10 flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  搜索结果: <span className="font-medium">{searchQuery}</span>
                </span>
                <span className="text-[10px] text-gray-400">共 {searchResults.length} 件</span>
              </div>
              {searchResults.length > 0 ? (
                searchResults.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center px-2 py-1.5 active:bg-gray-50"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    <div className="w-14 h-14 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden relative flex items-center justify-center">
                      <img
                        src={getImageUrl(product.image)}
                        alt={product.name}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          const svg = `<svg width="56" height="56" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f5f5f5"/><text x="50%" y="50%" font-family="Arial" font-size="10" text-anchor="middle" dominant-baseline="middle" fill="#999">暂无</text></svg>`;
                          e.target.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
                        }}
                        referrerPolicy="no-referrer"
                      />
                      {product.stock <= 10 && (
                        <div className="absolute top-0 left-0 bg-red-500 text-white text-[10px] px-1 py-0.5 rounded-br">
                          剩{product.stock}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 mx-2">
                      <h3 className="text-sm font-medium text-gray-800 truncate leading-tight">
                        {product.name}
                      </h3>
                      <p className="text-[10px] text-gray-400 leading-tight">{product.specs}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="text-orange-500 font-bold text-sm">
                        ฿{Number(product.price).toFixed(1)}<span className="text-[10px] text-gray-500">/{product.unit || '斤'}</span>
                      </div>
                      <button
                        onClick={(e) => handleAddCart(e, product)}
                        className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-sm active:scale-90 transition-transform"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-2">🔍</div>
                  <div>未找到 "{searchQuery}" 相关商品</div>
                </div>
              )}
            </div>
          ) : (
            productsByCategory.map((category) => (
              <div
                key={category.id}
                ref={(el) => (categoryRefs.current[category.id] = el)}
                className="mb-2"
              >
                <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 sticky top-0 z-10">
                  <span className="text-sm">{category.icon}</span>
                  <span className="font-bold text-gray-800 text-xs">{category.name}</span>
                  <span className="text-[10px] text-gray-400">({category.products.length})</span>
                </div>

                <div className="divide-y divide-gray-100">
                  {category.products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center px-2 py-1.5 active:bg-gray-50"
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      <div className="w-14 h-14 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden relative flex items-center justify-center">
                        <img
                          src={getImageUrl(product.image)}
                          alt={product.name}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            const svg = `<svg width="56" height="56" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f5f5f5"/><text x="50%" y="50%" font-family="Arial" font-size="10" text-anchor="middle" dominant-baseline="middle" fill="#999">暂无</text></svg>`;
                            e.target.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
                          }}
                          referrerPolicy="no-referrer"
                        />
                        {product.stock <= 10 && (
                          <div className="absolute top-0 left-0 bg-red-500 text-white text-[10px] px-1 py-0.5 rounded-br">
                            剩{product.stock}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 mx-2">
                        <h3 className="text-sm font-medium text-gray-800 truncate leading-tight">
                          {product.name}
                        </h3>
                        <p className="text-[10px] text-gray-400 leading-tight">{product.specs}</p>
                      </div>

                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className="text-orange-500 font-bold text-sm">
                          ฿{Number(product.price).toFixed(1)}<span className="text-[10px] text-gray-500">/{product.unit || '斤'}</span>
                        </div>
                        <button
                          onClick={(e) => handleAddCart(e, product)}
                          className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-sm active:scale-90 transition-transform"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 flex-shrink-0">
        <div className="flex max-w-[480px] mx-auto">
          <Link to="/" className="flex-1 py-2 flex flex-col items-center text-orange-500">
            <span className="text-xl">🏠</span>
            <span className="text-xs mt-0.5">首页</span>
          </Link>
          <Link to="/cart" className="flex-1 py-2 flex flex-col items-center text-gray-500 relative">
            <span className="text-xl">🛒</span>
            <span className="text-xs mt-0.5">购物车</span>
            {totalCount > 0 && (
              <span className="absolute top-1 right-1/4 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                {totalCount > 99 ? '99+' : totalCount}
              </span>
            )}
          </Link>
          <Link to="/order/list" className="flex-1 py-2 flex flex-col items-center text-gray-500">
            <span className="text-xl">📋</span>
            <span className="text-xs mt-0.5">订单</span>
          </Link>
          {isPromoter && (
            <Link to="/customers" className="flex-1 py-2 flex flex-col items-center text-gray-500">
              <span className="text-xl">👥</span>
              <span className="text-xs mt-0.5">客户</span>
            </Link>
          )}
          <Link to="/user" className="flex-1 py-2 flex flex-col items-center text-gray-500">
            <span className="text-xl">👤</span>
            <span className="text-xs mt-0.5">我的</span>
          </Link>
        </div>
      </div>
    </div>
  );
}