// 简单的内存缓存工具
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  // 设置缓存
  set(key, value, ttl = 300000) { // 默认5分钟
    // 清除旧定时器
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    this.cache.set(key, value);

    // 设置过期定时器
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  // 获取缓存
  get(key) {
    return this.cache.get(key);
  }

  // 检查是否存在
  has(key) {
    return this.cache.has(key);
  }

  // 删除缓存
  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return this.cache.delete(key);
  }

  // 清空缓存
  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.cache.clear();
    console.log('[Cache] All cleared');
  }

  // 根据前缀删除缓存
  deleteByPrefix(prefix) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.delete(key);
        count++;
      }
    }
    if (count > 0) {
      console.log(`[Cache] Cleared ${count} items with prefix: ${prefix}`);
    }
    return count;
  }

  // 根据多个前缀删除缓存
  deleteByPrefixes(prefixes) {
    let totalCount = 0;
    for (const prefix of prefixes) {
      totalCount += this.deleteByPrefix(prefix);
    }
    return totalCount;
  }
}

// 创建全局缓存实例
const cache = new MemoryCache();

// API缓存中间件
function apiCache(duration = 60000) { // 默认1分钟
  return (req, res, next) => {
    // 只缓存GET请求
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${req.originalUrl || req.url}`;

    // 检查缓存
    if (cache.has(key)) {
      console.log(`[Cache] Hit: ${key}`);
      return res.json(cache.get(key));
    }

    // 重写res.json方法以缓存响应
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      if (res.statusCode === 200) {
        cache.set(key, data, duration);
        console.log(`[Cache] Set: ${key}`);
      }
      return originalJson(data);
    };

    next();
  };
}

// 统一的缓存清除辅助函数
const clearAllCaches = () => {
  cache.clear();
};

// 清除相关缓存的快捷方法
const clearRelatedCaches = {
  // 清除商品和分类相关缓存
  products: () => cache.deleteByPrefixes(['/api/products', '/api/categories', '/products', '/categories']),

  // 清除订单相关缓存
  orders: () => cache.deleteByPrefixes(['/api/orders', '/orders']),

  // 清除轮播图相关缓存
  banners: () => cache.deleteByPrefixes(['/api/banners', '/banners']),

  // 清除客户相关缓存
  customers: () => cache.deleteByPrefixes(['/api/customers', '/customers']),

  // 清除用户相关缓存
  users: () => cache.deleteByPrefixes(['/api/users', '/api/admin/users', '/users', '/admin/users']),

  // 清除分销相关缓存
  distribution: () => cache.deleteByPrefixes(['/api/distribution', '/distribution']),

  // 清除价格相关缓存
  pricing: () => cache.deleteByPrefixes(['/api/pricing', '/pricing']),

  // 清除权限相关缓存
  permissions: () => cache.deleteByPrefixes(['/api/permissions', '/permissions']),

  // 清除网站信息相关缓存
  siteInfo: () => cache.deleteByPrefixes(['/api/site', '/site']),

  // 清除收货地址相关缓存
  addresses: () => cache.deleteByPrefixes(['/api/addresses', '/addresses'])
};

module.exports = { cache, apiCache, MemoryCache, clearAllCaches, clearRelatedCaches };