// 商品路由
const express = require('express');
const { getDb, saveDb } = require('../db/sqlite');
const { adminAuth } = require('../middleware/auth');
const { apiCache, cache, clearRelatedCaches } = require('../utils/cache');

const router = express.Router();

// 获取所有分类 - 缓存5分钟
router.get('/categories', apiCache(300000), (req, res) => {
  try {
    const db = getDb();
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();

    // 优化：一次性获取所有分类的商品数量，避免N+1查询
    const counts = db.prepare(`
      SELECT category_id, COUNT(*) as count 
      FROM products 
      GROUP BY category_id
    `).all();
    
    const countMap = new Map(counts.map(c => [c.category_id, c.count]));
    
    const result = categories.map(cat => ({
      ...cat,
      product_count: countMap.get(cat.id) || 0
    }));

    res.json({
      code: 200,
      data: result
    });
  } catch (error) {
    console.error('获取分类错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取所有商品 (路径: /api/products -> /) - 缓存1分钟
router.get('/', apiCache(60000), (req, res) => {
  try {
    const db = getDb();
    const { category_id, status = 'active', keyword } = req.query;
    
    let sql = `
      SELECT p.id, p.name, p.name_th, p.category_id, p.price, p.cost_price, 
             p.profit_weight, p.unit, p.specs, p.stock, p.image, p.description, 
             p.status, p.created_at, c.name as category_name, c.icon as category_icon
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category_id) {
      sql += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    if (keyword) {
      sql += ' AND (p.name LIKE ? OR p.name_th LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY p.created_at DESC';

    const products = db.prepare(sql).all(...params);

    res.json({
      code: 200,
      data: products
    });
  } catch (error) {
    console.error('获取商品错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 根据商品名称查询商品（用于订单编辑时自动更新价格）
router.get('/search/by-name', (req, res) => {
  try {
    const db = getDb();
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ code: 400, message: '商品名称不能为空' });
    }

    // 先尝试按泰文名称查询（因为泰文名称更特殊，匹配成功率更高）
    let product = db.prepare(`
      SELECT id, name, name_th, price, cost_price, unit, specs, stock, status
      FROM products
      WHERE name_th = ? AND (status = 'active' OR status = 1)
    `).get(name);

    // 如果没找到，再尝试按中文名称查询
    if (!product && name) {
      product = db.prepare(`
        SELECT id, name, name_th, price, cost_price, unit, specs, stock, status
        FROM products
        WHERE name = ? AND (status = 'active' OR status = 1)
      `).get(name);
    }

    if (!product) {
      return res.json({
        code: 404,
        message: '未找到对应商品',
        data: null
      });
    }

    res.json({
      code: 200,
      data: product
    });
  } catch (error) {
    console.error('查询商品错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取单个商品
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const product = db.prepare(`
      SELECT p.*, c.name as category_name, c.icon as category_icon
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);

    if (!product) {
      return res.status(404).json({ code: 404, message: '商品不存在' });
    }

    res.json({
      code: 200,
      data: product
    });
  } catch (error) {
    console.error('获取商品详情错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 管理端：添加商品
router.post('/', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { name, name_th, category_id, price, cost_price, profit_weight, unit, specs, stock, image, description } = req.body;

    if (!name || !price) {
      return res.status(400).json({ code: 400, message: '商品名和价格不能为空' });
    }

    const result = db.prepare(`
      INSERT INTO products (name, name_th, category_id, price, cost_price, profit_weight, unit, specs, stock, image, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, name_th, category_id, price, cost_price || null, profit_weight || null, unit || '斤', specs, stock || 0, image, description);
    
    saveDb();

    // 清除商品和分类缓存
    clearRelatedCaches.products();

    res.json({
      code: 200,
      message: '添加成功',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    console.error('添加商品错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 管理端：更新商品
router.put('/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { name, name_th, category_id, price, cost_price, profit_weight, unit, specs, stock, image, description, status } = req.body;

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ code: 404, message: '商品不存在' });
    }

    // 处理 undefined 值，转换为 null
    const safeValues = [
      name !== undefined ? name : null,
      name_th !== undefined ? name_th : null,
      category_id !== undefined ? category_id : null,
      price !== undefined ? price : null,
      cost_price !== undefined ? cost_price : null,
      profit_weight !== undefined ? profit_weight : null,
      unit !== undefined ? unit : null,
      specs !== undefined ? specs : null,
      stock !== undefined ? stock : null,
      image !== undefined ? image : null,
      description !== undefined ? description : null,
      status !== undefined ? status : null,
      id
    ];

    db.prepare(`
      UPDATE products SET 
       name = COALESCE(?, name),
       name_th = COALESCE(?, name_th),
       category_id = COALESCE(?, category_id),
       price = COALESCE(?, price),
       cost_price = COALESCE(?, cost_price),
       profit_weight = COALESCE(?, profit_weight),
       unit = COALESCE(?, unit),
       specs = COALESCE(?, specs),
       stock = COALESCE(?, stock),
       image = COALESCE(?, image),
       description = COALESCE(?, description),
       status = COALESCE(?, status)
       WHERE id = ?
    `).run(...safeValues);
    
    saveDb();

    // 清除商品和分类缓存
    clearRelatedCaches.products();

    res.json({
      code: 200,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新商品错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 管理端：删除商品
router.delete('/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ code: 404, message: '商品不存在' });
    }
    
    saveDb();

    // 清除商品和分类缓存
    clearRelatedCaches.products();

    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除商品错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 管理端：清空所有商品并重置ID
router.delete('/admin/clear-all', adminAuth, (req, res) => {
  try {
    const db = getDb();
    
    // 删除所有商品
    db.prepare('DELETE FROM products').run();
    
    // 重置自增ID计数器（SQLite）
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'products'").run();
    
    saveDb();

    // 清除商品和分类缓存
    clearRelatedCaches.products();

    res.json({
      code: 200,
      message: '商品已清空，ID已重置'
    });
  } catch (error) {
    console.error('清空商品错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message });
  }
});

// 管理端：添加分类
router.post('/categories', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { name, icon, sort_order } = req.body;

    if (!name) {
      return res.status(400).json({ code: 400, message: '分类名称不能为空' });
    }

    const result = db.prepare(
      'INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)'
    ).run(name, icon, sort_order || 0);
    
    saveDb();
    
    // 清除商品和分类缓存
    clearRelatedCaches.products();

    res.json({
      code: 200,
      message: '添加成功',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    console.error('添加分类错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 管理端：更新分类
router.put('/categories/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { name, icon, sort_order } = req.body;

    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ code: 404, message: '分类不存在' });
    }

    db.prepare(`
      UPDATE categories SET 
        name = ?,
        icon = ?,
        sort_order = ?
      WHERE id = ?
    `).run(name || existing.name, icon || existing.icon, sort_order !== undefined ? sort_order : existing.sort_order, id);
    
    saveDb();
    
    // 清除商品和分类缓存
    clearRelatedCaches.products();

    res.json({
      code: 200,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新分类错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 管理端：删除分类
router.delete('/categories/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    // 检查分类下是否有商品
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(id);
    if (productCount.count > 0) {
      return res.status(400).json({ code: 400, message: '该分类下还有商品，无法删除' });
    }

    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ code: 404, message: '分类不存在' });
    }
    
    saveDb();
    
    // 清除商品和分类缓存
    clearRelatedCaches.products();

    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除分类错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
