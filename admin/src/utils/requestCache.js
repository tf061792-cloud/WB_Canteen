// 前端请求缓存工具
class RequestCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100; // 最大缓存条目数
  }

  // 生成缓存键
  generateKey(url, options = {}) {
    const method = options.method || 'GET';
    const body = options.body || '';
    return `${method}:${url}:${body}`;
  }

  // 获取缓存
  get(url, options = {}) {
    // 只缓存GET请求
    if ((options.method || 'GET') !== 'GET') return null;
    
    const key = this.generateKey(url, options);
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // 检查是否过期
    if (Date.now() > item.expireTime) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`[Cache] Hit: ${url}`);
    return item.data;
  }

  // 设置缓存
  set(url, options = {}, data, ttl = 30000) { // 默认30秒
    // 只缓存GET请求
    if ((options.method || 'GET') !== 'GET') return;
    
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    const key = this.generateKey(url, options);
    this.cache.set(key, {
      data,
      expireTime: Date.now() + ttl
    });
    console.log(`[Cache] Set: ${url}`);
  }

  // 清除缓存
  clear() {
    this.cache.clear();
  }

  // 根据URL前缀清除缓存
  clearByPrefix(prefix) {
    // 先收集所有匹配的键，然后再删除，避免迭代器问题
    const keysToDelete = [];
    for (const [key] of this.cache.entries()) {
      if (key.includes(prefix)) {
        keysToDelete.push(key);
      }
    }
    // 批量删除
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      console.log(`[Cache] Cleared: ${key}`);
    });
  }
}

// 防抖函数
export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// 节流函数
export function throttle(fn, limit = 300) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 创建全局缓存实例
const requestCache = new RequestCache();

export { requestCache, RequestCache };
