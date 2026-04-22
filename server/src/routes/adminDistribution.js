const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const { getDb, saveDb } = require('../db/sqlite');
const clearRelatedCaches = require('../utils/cache').clearRelatedCaches;

// 获取所有推广员申请（管理端）
router.get('/applications', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { page = 1, pageSize = 10, status } = req.query;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (status) {
      whereClause += ' AND pa.status = ?';
      params.push(status);
    }

    const list = db.prepare(`
      SELECT pa.*, u.username, u.nickname
      FROM promoter_applications pa
      JOIN users u ON pa.user_id = u.id
      ${whereClause}
      ORDER BY pa.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), parseInt(offset));

    const countParams = [...params];
    const total = db.prepare(`SELECT COUNT(*) as count FROM promoter_applications pa ${whereClause}`).get(...countParams);

    res.json({
      code: 200,
      data: {
        list,
        total: total.count,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取推广员申请列表失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 审核推广员申请（管理端）
router.put('/applications/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status } = req.body; // approved, rejected

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ code: 400, message: '无效的状态' });
    }

    const application = db.prepare('SELECT * FROM promoter_applications WHERE id = ?').get(id);
    if (!application) {
      return res.status(404).json({ code: 404, message: '申请不存在' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ code: 400, message: '该申请已处理' });
    }

    db.prepare('UPDATE promoter_applications SET status = ?, updated_at = datetime("now") WHERE id = ?').run(status, id);

    if (status === 'approved') {
      db.prepare('UPDATE users SET role = "promoter" WHERE id = ?').run(application.user_id);
      clearRelatedCaches.users();
    }

    res.json({ code: 200, message: '审核成功' });
  } catch (error) {
    console.error('审核推广员申请失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取所有推广员列表（管理端）
router.get('/promoters', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    // 获取提成配置
    const rateConfig = db.prepare("SELECT config_value FROM system_config WHERE config_key = 'commission_rate'").get();
    const commissionRate = rateConfig ? parseFloat(rateConfig.config_value) : 10;

    const list = db.prepare(`
      SELECT u.id, u.username, u.nickname, u.created_at,
        (SELECT COUNT(*) FROM promoter_bindings WHERE promoter_id = u.id AND status = 'active') as customer_count,
        (SELECT COALESCE(SUM(o.total), 0) FROM orders o 
         INNER JOIN promoter_bindings pb ON o.user_id = pb.customer_id 
         WHERE pb.promoter_id = u.id AND pb.status = 'active' 
         AND o.status NOT IN ('cancelled', 'pending')) as total_sales,
        (SELECT COALESCE(SUM(
           CASE 
             WHEN o.actual_amount IS NOT NULL AND o.actual_cost IS NOT NULL 
             THEN (o.actual_amount - o.actual_cost) * ? / 100
             WHEN o.profit_amount IS NOT NULL 
             THEN o.profit_amount * ? / 100
             ELSE 0
           END
         ), 0) FROM orders o 
         INNER JOIN promoter_bindings pb ON o.user_id = pb.customer_id 
         WHERE pb.promoter_id = u.id AND pb.status = 'active' 
         AND o.status NOT IN ('cancelled', 'pending')) as total_commission
      FROM users u
      WHERE u.role = 'promoter'
      ORDER BY u.id DESC
      LIMIT ? OFFSET ?
    `).all(commissionRate, commissionRate, parseInt(pageSize), parseInt(offset));

    const total = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'promoter'").get();

    res.json({
      code: 200,
      data: {
        list,
        total: total.count,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取推广员列表失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取推广员详情（包含客户列表）
router.get('/promoters/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const promoter = db.prepare('SELECT id, username, nickname, created_at FROM users WHERE id = ? AND role = "promoter"').get(id);
    if (!promoter) {
      return res.status(404).json({ code: 404, message: '推广员不存在' });
    }

    // 客户列表
    const customers = db.prepare(`
      SELECT u.id, u.username, u.nickname, pb.bind_time,
        (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = u.id AND status != 'cancelled') as total_amount
      FROM promoter_bindings pb
      JOIN users u ON pb.customer_id = u.id
      WHERE pb.promoter_id = ? AND pb.status = 'active'
    `).all(id);

    // 收益统计
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(order_amount), 0) as total_sales,
        COALESCE(SUM(commission_amount), 0) as total_commission
      FROM promoter_earnings 
      WHERE promoter_id = ?
    `).get(id);

    res.json({
      code: 200,
      data: {
        promoter,
        customers,
        ...stats
      }
    });
  } catch (error) {
    console.error('获取推广员详情失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取提成配置
router.get('/commission-config', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const typeConfig = db.prepare("SELECT * FROM system_config WHERE config_key = 'commission_type'").get();
    const rateConfig = db.prepare("SELECT * FROM system_config WHERE config_key = 'commission_rate'").get();

    res.json({
      code: 200,
      data: {
        commission_type: typeConfig ? typeConfig.config_value : 'profit',
        commission_rate: rateConfig ? parseFloat(rateConfig.config_value) : 10,
        commission_type_desc: typeConfig ? typeConfig.description : '提成类型：profit=毛利润百分比，sales=销售额百分比'
      }
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

    if (commission_type) {
      db.prepare("UPDATE system_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = 'commission_type'")
        .run(commission_type);
    }

    if (commission_rate !== undefined) {
      db.prepare("UPDATE system_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = 'commission_rate'")
        .run(commission_rate.toString());
    }

    // 保存数据库更改到磁盘
    saveDb();

    res.json({ code: 200, message: '提成配置更新成功' });
  } catch (error) {
    console.error('更新提成配置失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取所有收益记录
router.get('/earnings', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { page = 1, pageSize = 10, promoter_id, status } = req.query;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (promoter_id) {
      whereClause += ' AND pe.promoter_id = ?';
      params.push(promoter_id);
    }

    if (status) {
      whereClause += ' AND pe.status = ?';
      params.push(status);
    }

    const list = db.prepare(`
      SELECT 
        pe.*,
        p.nickname as promoter_name,
        u.nickname as customer_name,
        o.order_no
      FROM promoter_earnings pe
      JOIN users p ON pe.promoter_id = p.id
      JOIN users u ON pe.customer_id = u.id
      JOIN orders o ON pe.order_id = o.id
      ${whereClause}
      ORDER BY pe.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), parseInt(offset));

    const countParams = [...params];
    const total = db.prepare(`SELECT COUNT(*) as count FROM promoter_earnings pe ${whereClause}`).get(...countParams);

    res.json({
      code: 200,
      data: {
        list,
        total: total.count,
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
    
    db.prepare('UPDATE promoter_earnings SET status = "settled" WHERE id = ?').run(id);
    
    res.json({ code: 200, message: '结算成功' });
  } catch (error) {
    console.error('结算收益失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;