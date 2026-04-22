const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/sqlite');
const { apiCache, cache } = require('../utils/cache');

// 获取商品价格列表
router.get('/products', (req, res) => {
  try {
    const db = getDb();
    const { page = 1, pageSize = 10, category_id, categoryId, keyword, sortField = 'id', sortOrder = 'desc' } = req.query;
    
    // 调试日志
    console.log('[DEBUG] Pricing API received:', { page, pageSize, category_id, categoryId, keyword, sortField, sortOrder });
    
    // 兼容 category_id 和 categoryId
    const categoryIdValue = category_id || categoryId;
    
    // 强制使用50作为页大小
    const effectivePageSize = 50;
    const effectiveOffset = (parseInt(page) - 1) * effectivePageSize; 
    
    console.log('[DEBUG] Effective values:', { page: parseInt(page), pageSize: effectivePageSize, offset: effectiveOffset }); 
    
    let whereClause = 'WHERE 1=1';
    let params = []; 
    
    if (categoryIdValue) { 
      whereClause += ' AND p.category_id = ?';
      params.push(categoryIdValue);
    }
    
    if (keyword) { 
      whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    // 获取总数
    const countResult = db.prepare(`SELECT COUNT(*) as total FROM products p ${whereClause}`).get(...params);
    const total = countResult?.total || 0; 
    
    // 验证排序字段和顺序
    const allowedFields = ['id', 'name', 'name_th', 'price', 'stock', 'cost_price', 'profit_weight'];
    const allowedOrders = ['asc', 'desc']; 
    const validSortField = allowedFields.includes(sortField) ? sortField : 'id';
    const validSortOrder = allowedOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc'; 
    
    // 获取列表（成本价、利润加权、售价）
    const list = db.prepare(`
      SELECT p.id, p.name, p.name_th, p.image, p.category_id, p.unit, p.specs, p.stock, p.status,
        p.cost_price,
        p.profit_weight,
        p.price as sale_price,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.${validSortField} ${validSortOrder === 'asc' ? 'ASC' : 'DESC'}
      LIMIT ? OFFSET ?
    `).all(...params, effectivePageSize, effectiveOffset);
    
    console.log('[DEBUG] Query result:', { listLength: list.length, total });
    
    res.json({
      code: 200,
      data: {
        list,
        total,
        page: parseInt(page),
        pageSize: effectivePageSize
      }
    });
  } catch (error) {
    console.error('获取商品价格列表失败:', error.message);
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message });
  }
});

// 更新商品价格信息（批量或单个）
router.put('/products/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { cost_price, profit_weight } = req.body;
    
    const updates = [];
    const params = [];
    
    // 成本价
    if (cost_price !== undefined) {
      updates.push('cost_price = ?');
      params.push(cost_price);
    }
    
    // 利润加权
    if (profit_weight !== undefined) {
      updates.push('profit_weight = ?');
      params.push(profit_weight);
      // 自动计算售价 = 成本价 + 利润加权
      const product = db.prepare('SELECT cost_price FROM products WHERE id = ?').get(id);
      if (product) {
        const currentCost = cost_price !== undefined ? cost_price : product.cost_price;
        const newPrice = parseFloat(currentCost) + parseFloat(profit_weight);
        updates.push('price = ?');
        params.push(newPrice);
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ code: 400, message: '没有要更新的字段' });
    }
    
    params.push(id);
    
    db.prepare(`UPDATE products SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...params);
    
    res.json({ code: 200, message: '更新成功' });
  } catch (error) {
    console.error('更新商品价格失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 批量更新价格
router.put('/products/batch', (req, res) => {
  try {
    const db = getDb();
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ code: 400, message: '无效的数据' });
    }
    
    let updatedCount = 0;
    
    items.forEach(item => {
      const { id, cost_price, profit_weight } = item;
      const product = db.prepare('SELECT cost_price FROM products WHERE id = ?').get(id);
      
      if (product) {
        const newCost = cost_price !== undefined ? cost_price : product.cost_price;
        const newProfit = profit_weight !== undefined ? profit_weight : product.profit_weight;
        const newPrice = parseFloat(newCost) + parseFloat(newProfit);
        
        db.prepare('UPDATE products SET cost_price = ?, profit_weight = ?, price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newCost, newProfit, newPrice, id);
        updatedCount++;
      }
    });
    
    res.json({ code: 200, message: `成功更新 ${updatedCount} 个商品` });
  } catch (error) {
    console.error('批量更新价格失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取成本价（操作员用）
router.get('/cost-prices', (req, res) => {
  try {
    const db = getDb();
    const { page = 1, pageSize = 10, category_id } = req.query;
    const offset = (page - 1) * pageSize;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (category_id) {
      whereClause += ' AND p.category_id = ?';
      params.push(category_id);
    }
    
    // 获取总数
    const countResult = db.prepare(`SELECT COUNT(*) as total FROM products p ${whereClause}`).get(...params);
    const total = countResult?.total || 0;
    
    // 获取列表（只显示成本价）
    const list = db.prepare(`
      SELECT p.id, p.name, p.image, p.cost_price
      FROM products p
      ${whereClause}
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), offset);
    
    res.json({
      code: 200,
      data: {
        list,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取成本价列表失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取价格统计
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN cost_price IS NULL OR cost_price = 0 THEN 1 ELSE 0 END) as missing_cost,
        SUM(CASE WHEN profit_weight IS NULL THEN 1 ELSE 0 END) as missing_profit,
        SUM(cost_price) as total_cost,
        SUM(profit_weight) as total_profit,
        SUM(price) as total_sale
      FROM products
      WHERE status = 'active'
    `).get();
    
    res.json({
      code: 200,
      data: stats
    });
  } catch (error) {
    console.error('获取价格统计失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
