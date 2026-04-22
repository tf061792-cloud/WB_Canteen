const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/sqlite');
const { adminAuth } = require('../middleware/auth');
const { clearRelatedCaches } = require('../utils/cache');

// 获取客户列表
router.get('/', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { page = 1, pageSize = 10, keyword = '', role } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    console.log('[Customers] Query params:', { page, pageSize, keyword, role });
    
    // 基础查询 - 包含parent_id和order_title
    let query = 'SELECT id, username, nickname, role, parent_id, order_title, created_at FROM users';
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    let params = [];
    let conditions = [];
    
    if (keyword) {
      conditions.push('(username LIKE ? OR nickname LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }
    
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }
    
    console.log('[Customers] SQL:', query);
    console.log('[Customers] Params:', params);
    
    // 获取总数
    const countStmt = db.prepare(countQuery);
    const countResult = countStmt.get(...params);
    const total = countResult?.total || 0;
    
    console.log('[Customers] Total:', total);
    
    // 获取列表
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const listStmt = db.prepare(query);
    const list = listStmt.all(...params, parseInt(pageSize), offset);
    
    console.log('[Customers] List count:', list.length, 'First item role:', list[0]?.role);
    
    // 获取订单统计和推广员信息
    for (const user of list) {
      // 订单统计
      const orderStats = db.prepare(
        'SELECT COUNT(*) as order_count, COALESCE(SUM(total), 0) as total_amount FROM orders WHERE user_id = ? AND status != ?'
      ).get(user.id, 'cancelled');
      user.order_count = orderStats?.order_count || 0;
      user.total_amount = orderStats?.total_amount || 0;
      
      // 所属推广员信息
      if (user.parent_id) {
        const promoter = db.prepare('SELECT nickname, username FROM users WHERE id = ?').get(user.parent_id);
        user.promoter_name = promoter ? (promoter.nickname || promoter.username) : '未知';
      } else {
        user.promoter_name = null;
      }
    }
    
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
    console.error('获取客户列表失败:', error.message);
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message });
  }
});

// 获取客户详情
router.get('/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    const customer = db.prepare(
      'SELECT id, username, nickname, role, created_at FROM users WHERE id = ?'
    ).get(id);
    
    if (!customer) {
      return res.status(404).json({ code: 404, message: '客户不存在' });
    }
    
    // 获取订单统计
    const orderStats = db.prepare(
      'SELECT COUNT(*) as order_count, COALESCE(SUM(total), 0) as total_amount FROM orders WHERE user_id = ? AND status != ?'
    ).get(id, 'cancelled');
    customer.order_count = orderStats?.order_count || 0;
    customer.total_amount = orderStats?.total_amount || 0;
    
    // 获取客户订单
    const orders = db.prepare(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
    ).all(id);
    
    // 获取订单商品
    for (const order of orders) {
      order.items = db.prepare(
        `SELECT oi.*, p.image as product_image 
         FROM order_items oi 
         LEFT JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`
      ).all(order.id);
    }
    
    res.json({
      code: 200,
      data: {
        ...customer,
        orders
      }
    });
  } catch (error) {
    console.error('获取客户详情失败:', error.message);
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message });
  }
});

// 更新客户信息
router.put('/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { nickname, role, parent_id, order_title } = req.body;
    
    const updates = [];
    const params = [];
    
    if (nickname !== undefined) {
      updates.push('nickname = ?');
      params.push(nickname);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }
    if (parent_id !== undefined) {
      updates.push('parent_id = ?');
      params.push(parent_id);
    }
    if (order_title !== undefined) {
      updates.push('order_title = ?');
      params.push(order_title);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ code: 400, message: '没有要更新的字段' });
    }
    
    params.push(id);
    
    db.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    ).run(...params);

    // 同步更新 promoter_bindings 表
    if (parent_id !== undefined) {
      // 先删除旧的绑定关系
      db.prepare('DELETE FROM promoter_bindings WHERE customer_id = ?').run(id);

      // 如果设置了新的推广员，添加新的绑定关系
      if (parent_id) {
        const promoter = db.prepare('SELECT id FROM users WHERE id = ? AND role = "promoter"').get(parent_id);
        if (promoter) {
          db.prepare(
            'INSERT INTO promoter_bindings (promoter_id, customer_id, status, bind_time) VALUES (?, ?, "active", datetime("now"))'
          ).run(parent_id, id);
        }
      }
    }

    // 保存到数据库文件
    saveDb();
    
    // 清除客户相关缓存
    clearRelatedCaches.customers();

    res.json({ code: 200, message: '更新成功' });
  } catch (error) {
    console.error('更新客户信息失败:', error.message);
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message });
  }
});

// 删除客户
router.delete('/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    // 保存到数据库文件
    saveDb();
    
    // 清除客户相关缓存
    clearRelatedCaches.customers();

    res.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除客户失败:', error.message);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取客户统计
router.get('/stats/overview', adminAuth, (req, res) => {
  try {
    const db = getDb();
    
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'promoter' THEN 1 ELSE 0 END) as promoter_count,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as normal_count,
        SUM(CASE WHEN role = 'operator' THEN 1 ELSE 0 END) as operator_count,
        SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END) as today_new
      FROM users
    `).get();
    
    res.json({ code: 200, data: stats });
  } catch (error) {
    console.error('获取客户统计失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
