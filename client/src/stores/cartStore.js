import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      itemCount: 0,  // 商品种类数量
      totalCount: 0, // 总数量
      
      // 更新计算值
      updateCounts: () => {
        const items = get().items;
        set({
          itemCount: items.length,
          totalCount: items.reduce((sum, item) => sum + item.quantity, 0)
        });
      },
      
      // 添加商品到购物车
      addItem: (product, quantity = 1) => {
        const items = get().items;
        const existingIndex = items.findIndex(item => item.product_id === product.id);
        
        if (existingIndex >= 0) {
          // 已存在，增加数量
          items[existingIndex].quantity += quantity;
        } else {
          // 新增
          items.push({
            product_id: product.id,
            name: product.name,
            price: Number(product.price),
            image: product.image,
            specs: product.specs || '',
            unit: product.unit || '斤',
            quantity
          });
        }
        
        set({ items: [...items] });
        get().updateCounts(); // 更新计数
      },
      
      // 更新数量
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        
        const items = get().items.map(item => 
          item.product_id === productId 
            ? { ...item, quantity } 
            : item
        );
        set({ items });
        get().updateCounts(); // 更新计数
      },
      
      // 移除商品
      removeItem: (productId) => {
        const items = get().items.filter(item => item.product_id !== productId);
        set({ items });
        get().updateCounts(); // 更新计数
      },
      
      // 清空购物车
      clearCart: () => {
        set({ items: [] });
        get().updateCounts(); // 更新计数
      },
      
      // 获取购物车总金额
      getTotalPrice: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      }
    }),
    {
      name: 'cart-storage',
      onRehydrateStorage: () => (state) => {
        // 重新hydrate后更新计数
        if (state && state.items) {
          state.itemCount = state.items.length;
          state.totalCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
        }
      }
    }
  )
);
