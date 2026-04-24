import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      // 购物车商品种类数量（不同商品的数量）
      get itemCount() {
        return get().items.length;
      },
      
      // 购物车总数量（所有商品的数量总和）
      get totalCount() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
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
      },
      
      // 移除商品
      removeItem: (productId) => {
        const items = get().items.filter(item => item.product_id !== productId);
        set({ items });
      },
      
      // 清空购物车
      clearCart: () => {
        set({ items: [] });
      },
      
      // 获取购物车总数量（所有商品的数量总和）
      getTotalCount: () => {
        return get().totalCount;
      },
      
      // 获取购物车总金额
      getTotalPrice: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      }
    }),
    {
      name: 'cart-storage'
    }
  )
);
