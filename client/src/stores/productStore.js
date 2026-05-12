import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useProductStore = create(
  persist(
    (set, get) => ({
      categories: [],
      products: [],
      banners: [],
      lastUpdated: null,
      isLoading: false,

      // 设置商品和分类数据
      setData: (categories, products, banners) => {
        set({
          categories,
          products,
          banners,
          lastUpdated: Date.now()
        });
      },

      // 清除缓存
      clearCache: () => {
        set({
          categories: [],
          products: [],
          banners: [],
          lastUpdated: null
        });
      },

      // 检查缓存是否有效（5分钟内有效）
      isCacheValid: () => {
        const lastUpdated = get().lastUpdated;
        if (!lastUpdated) return false;
        const fiveMinutes = 5 * 60 * 1000;
        return (Date.now() - lastUpdated) < fiveMinutes;
      },

      // 获取分类
      getCategories: () => get().categories,

      // 获取商品
      getProducts: () => get().products,

      // 获取轮播图
      getBanners: () => get().banners
    }),
    {
      name: 'product-storage',
      partialize: (state) => ({
        categories: state.categories,
        products: state.products,
        banners: state.banners,
        lastUpdated: state.lastUpdated
      })
    }
  )
);