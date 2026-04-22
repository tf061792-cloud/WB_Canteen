const express = require('express');
const router = express.Router();
const { getDb } = require('../db/sqlite');
const { adminAuth } = require('../middleware/auth');

// 获取推广员列表
router.get('/promoters', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { page = 1, pageSize = 10, keyword = '' } = req.query;
    const offset = (page - 1) * pageSize;
    
    let whereClause = 'WHERE role = ?';
    let params = ['promoter'];
    
    if (keyword) {
      whereClause += ' AND (username LIKE ? OR nickname LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    // 获取总数
    const countResult = db.prepare(
      `SELECT COUNT(*) as total FROM users ${whereClause}`
    ).get(...params);
    const total = countResult.total;
    
    // 获取列表
    const list = db.prepare(
      `SELECT id, username, nickname, role, created_at,
        (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as order_count,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = users.id AND status != 'cancelled') as total_sales,
        (SELECT COUNT(*) FROM users WHERE parent_id = users.id) as customer_count,
        (SELECT COALESCE(SUM(commission_amount), 0) FROM promoter_earnings WHERE promoter_id = users.id) as total_commission
      FROM users ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`
    ).all(...params, parseInt(pageSize), parseInt(offset));
    
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
    console.error('获取推广员列表失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取推广统计
router.get('/stats', adminAuth, (req, res) => {
  try {
    const db = getDb();
    
    // 推广员总数
    const promoterCount = db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE role = 'promoter'"
    ).get().count;
    
    // 推广订单统计
    const orderStats = db.prepare(`
      SELECT 
        COUNT(*) as order_count,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(SUM(commission_amount), 0) as total_commission
      FROM orders 
      WHERE user_id IN (SELECT id FROM users WHERE role = 'promoter')
      AND status != 'cancelled'
    `).get();
    
    // 本月推广数据
    const monthStats = db.prepare(`
      SELECT 
        COUNT(*) as order_count,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(SUM(commission_amount), 0) as total_commission
      FROM orders 
      WHERE user_id IN (SELECT id FROM users WHERE role = 'promoter')
      AND status != 'cancelled'
      AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get();
    
    // 推广员业绩排行
    const topPromoters = db.prepare(`
      SELECT u.id, u.username, u.nickname,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total), 0) as total_amount,
        COALESCE(SUM(o.commission_amount), 0) as total_commission
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id AND o.status != 'cancelled'
      WHERE u.role = 'promoter'
      GROUP BY u.id
      ORDER BY total_amount DESC
      LIMIT 10
    `).all();
    
    res.json({
      code: 200,
      data: {
        promoter_count: promoterCount,
        order_stats: orderStats,
        month_stats: monthStats,
        top_promoters: topPromoters
      }
    });
  } catch (error) {
    console.error('获取推广统计失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取推广员详情
router.get('/promoters/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    // 获取推广员信息
    const promoter = db.prepare(
      `SELECT id, username, nickname, role, created_at,
        (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as order_count,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = users.id AND status != 'cancelled') as total_sales,
        (SELECT COUNT(*) FROM users WHERE parent_id = users.id) as customer_count,
        (SELECT COALESCE(SUM(commission_amount), 0) FROM promoter_earnings WHERE promoter_id = users.id) as total_commission
      FROM users WHERE id = ? AND role = 'promoter'`
    ).get(id);
    
    if (!promoter) {
      return res.status(404).json({ code: 404, message: '推广员不存在' });
    }
    
    // 获取关联客户列表
    const customers = db.prepare(
      `SELECT id, username, nickname, created_at,
        (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as order_count,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = users.id AND status != 'cancelled') as total_amount
      FROM users 
      WHERE parent_id = ?
      ORDER BY created_at DESC`
    ).all(id);
    
    // 获取推广订单明细
    const orders = db.prepare(
      `SELECT o.*, u.nickname as customer_name
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.user_id = ? 
      ORDER BY o.created_at DESC 
      LIMIT 20`
    ).all(id);
    
    // 月度统计
    const monthlyStats = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as order_count,
        COALESCE(SUM(total), 0) as total_amount,
        COALESCE(SUM(commission_amount), 0) as total_commission
      FROM orders 
      WHERE user_id = ? AND status != 'cancelled'
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
      LIMIT 12
    `).all(id);
    
    res.json({
      code: 200,
      data: {
        ...promoter,
        customers,
        orders,
        monthly_stats: monthlyStats
      }
    });
  } catch (error) {
    console.error('获取推广员详情失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取推广员客户列表
router.get('/promoters/:id/customers', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;
    
    // 验证推广员存在
    const promoter = db.prepare('SELECT id FROM users WHERE id = ? AND role = ?').get(id, 'promoter');
    if (!promoter) {
      return res.status(404).json({ code: 404, message: '推广员不存在' });
    }
    
    // 获取客户总数
    const countResult = db.prepare(
      'SELECT COUNT(*) as total FROM users WHERE parent_id = ?'
    ).get(id);
    
    // 获取客户列表
    const customers = db.prepare(
      `SELECT id, username, nickname, created_at,
        (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as order_count,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = users.id AND status != 'cancelled') as total_amount
      FROM users 
      WHERE parent_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`
    ).all(id, parseInt(pageSize), parseInt(offset));
    
    res.json({
      code: 200,
      data: {
        list: customers,
        total: countResult.total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取推广员客户列表失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 设置用户为推广员
router.post('/set-promoter/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    db.prepare("UPDATE users SET role = 'promoter' WHERE id = ?").run(id);
    
    res.json({ code: 200, message: '设置成功' });
  } catch (error) {
    console.error('设置推广员失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 取消推广员资格
router.post('/cancel-promoter/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    db.prepare("UPDATE users SET role = 'user' WHERE id = ?").run(id);
    
    res.json({ code: 200, message: '取消成功' });
  } catch (error) {
    console.error('取消推广员失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取收益记录
router.get('/earnings', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { page = 1, pageSize = 10, status } = req.query;
    const offset = (page - 1) * pageSize;
    
    let whereClause = '';
    let params = [];
    
    if (status) {
      whereClause = 'WHERE pe.status = ?';
      params.push(status);
    }
    
    // 获取总数
    const countResult = db.prepare(
      `SELECT COUNT(*) as total FROM promoter_earnings pe ${whereClause}`
    ).get(...params);
    
    // 获取收益列表
    const list = db.prepare(
      `SELECT pe.id, pe.order_amount, pe.profit_amount, pe.commission_type, pe.commission_rate, 
        pe.commission_amount, pe.status, pe.created_at,
        o.order_no,
        u.id as promoter_id, u.nickname as promoter_name,
        c.id as customer_id, c.nickname as customer_name
      FROM promoter_earnings pe
      JOIN orders o ON pe.order_id = o.id
      JOIN users u ON pe.promoter_id = u.id
      LEFT JOIN users c ON pe.customer_id = c.id
      ${whereClause}
      ORDER BY pe.created_at DESC
      LIMIT ? OFFSET ?`
    ).all(...params, parseInt(pageSize), parseInt(offset));
    
    res.json({
      code: 200,
      data: {
        list,
        total: countResult.total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取收益记录失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 结算收益
router.post('/earnings/:id/settle', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    db.prepare("UPDATE promoter_earnings SET status = 'settled' WHERE id = ?").run(id);
    
    res.json({ code: 200, message: '结算成功' });
  } catch (error) {
    console.error('结算失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取提成配置
router.get('/commission-config', adminAuth, (req, res) => {
  try {
    const db = getDb();
    
    // 从配置表获取，如果没有则返回默认配置
    let config = db.prepare("SELECT config_value FROM system_config WHERE config_key = 'commission'").get();
    
    if (!config) {
      config = {
        commission_type: 'profit',
        commission_rate: 10
      };
    } else {
      config = JSON.parse(config.config_value);
    }
    
    res.json({
      code: 200,
      data: config
    });
  } catch (error) {
    console.error('获取提成配置失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 更新提成配置
router.put('/commission-config', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { commission_type, commission_rate } = req.body;
    
    const config = JSON.stringify({ commission_type, commission_rate });
    
    // 检查是否已存在
    const existing = db.prepare("SELECT id FROM system_config WHERE config_key = 'commission'").get();
    
    if (existing) {
      db.prepare("UPDATE system_config SET config_value = ? WHERE config_key = 'commission'").run(config);
    } else {
      db.prepare("INSERT INTO system_config (config_key, config_value, description) VALUES ('commission', ?, '提成配置')").run(config);
    }
    
    res.json({ code: 200, message: '更新成功' });
  } catch (error) {
    console.error('更新提成配置失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
