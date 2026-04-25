const express = require('express');
const router = express.Router();
const { userAuth: authenticate } = require('../middleware/auth');
const { getDb } = require('../db/sqlite');

// 获取数据库实例的辅助函数
const db = () => getDb();

// 申请成为推广员
router.post('/apply-upgrade', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const user = db().prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    if (user.role === 'promoter') {
      return res.status(400).json({ code: 400, message: '您已经是推广员' });
    }

    const existingApplication = db().prepare(
      'SELECT * FROM promoter_applications WHERE user_id = ? AND status = "pending"'
    ).get(userId);

    if (existingApplication) {
      return res.status(400).json({ code: 400, message: '您已有待处理的申请' });
    }

    db().prepare(
      'INSERT INTO promoter_applications (user_id, status, created_at) VALUES (?, "pending", datetime("now"))'
    ).run(userId);

    res.json({ code: 200, message: '申请已提交，等待管理员审核' });
  } catch (error) {
    console.error('申请成为推广员失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取升级申请状态
router.get('/upgrade-status', authenticate, (req, res) => {
  try {
    const userId = req.user.id;

    const applications = db().prepare(
      'SELECT * FROM promoter_applications WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId);

    res.json({ code: 200, data: applications });
  } catch (error) {
    console.error('获取升级状态失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取推广邀请链接
router.get('/invite-link', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'promoter') {
      return res.status(403).json({ code: 403, message: '无权限访问' });
    }

    const db = getDb();
    let user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user.promoter_code) {
      const code = 'P' + req.user.id + Math.random().toString(36).substr(2, 6).toUpperCase();
      db.prepare('UPDATE users SET promoter_code = ? WHERE id = ?').run(code, req.user.id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    }

    // 根据请求来源生成正确的邀请链接
    const clientUrl = process.env.CLIENT_URL || 'https://wbcanteen-client.vercel.app';
    const inviteLink = `${clientUrl}/register?code=${user.promoter_code}`;

    res.json({
      code: 200,
      data: {
        promoter_code: user.promoter_code,
        invite_link: inviteLink
      }
    });
  } catch (error) {
    console.error('获取推广链接失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取我的客户列表（推广员）
router.get('/customers', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'promoter') {
      return res.status(403).json({ code: 403, message: '无权限访问' });
    }

    const promoterId = req.user.id;

    const customers = db().prepare(`
      SELECT u.id, u.username, u.nickname, u.role, u.created_at, pb.bind_time,
        (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = u.id AND status != 'cancelled') as total_amount,
        (SELECT COALESCE(SUM(pe.commission_amount), 0) FROM promoter_earnings pe WHERE pe.customer_id = u.id AND pe.promoter_id = ?) as total_commission
      FROM promoter_bindings pb
      JOIN users u ON pb.customer_id = u.id
      WHERE pb.promoter_id = ? AND pb.status = 'active'
      ORDER BY pb.bind_time DESC
    `).all(promoterId, promoterId);

    res.json({ code: 200, data: customers });
  } catch (error) {
    console.error('获取客户列表失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 绑定客户（推广员操作）
router.post('/bind-customer', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'promoter') {
      return res.status(403).json({ code: 403, message: '无权限绑定客户' });
    }

    const { customerUsername } = req.body;
    const promoterId = req.user.id;

    const customer = db().prepare('SELECT * FROM users WHERE username = ?').get(customerUsername);
    if (!customer) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    if (customer.id === promoterId) {
      return res.status(400).json({ code: 400, message: '不能绑定自己' });
    }

    const existingBinding = db().prepare('SELECT * FROM promoter_bindings WHERE customer_id = ? AND status = "active"').get(customer.id);
    if (existingBinding) {
      return res.status(400).json({ code: 400, message: '该用户已被其他推广员绑定' });
    }

    const existing = db().prepare('SELECT * FROM promoter_bindings WHERE promoter_id = ? AND customer_id = ?').get(promoterId, customer.id);
    if (existing) {
      return res.status(400).json({ code: 400, message: '该用户已经是您的客户' });
    }

    db().prepare('INSERT INTO promoter_bindings (promoter_id, customer_id) VALUES (?, ?)').run(promoterId, customer.id);

    res.json({ code: 200, message: '绑定成功' });
  } catch (error) {
    console.error('绑定客户失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 解绑客户
router.post('/unbind-customer', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'promoter') {
      return res.status(403).json({ code: 403, message: '无权限操作' });
    }

    const { customerId } = req.body;
    const promoterId = req.user.id;

    db().prepare('UPDATE promoter_bindings SET status = "inactive" WHERE promoter_id = ? AND customer_id = ?')
      .run(promoterId, customerId);

    res.json({ code: 200, message: '解绑成功' });
  } catch (error) {
    console.error('解绑客户失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取推广统计（推广员）
router.get('/statistics', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'promoter') {
      return res.status(403).json({ code: 403, message: '无权限访问' });
    }

    const promoterId = req.user.id;

    const customerCount = db().prepare('SELECT COUNT(*) as count FROM promoter_bindings WHERE promoter_id = ? AND status = "active"').get(promoterId);

    const earningsStats = db().prepare(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(order_amount), 0) as total_sales,
        COALESCE(SUM(commission_amount), 0) as total_commission,
        COALESCE(SUM(CASE WHEN status = 'settled' THEN commission_amount ELSE 0 END), 0) as settled_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_amount
      FROM promoter_earnings
      WHERE promoter_id = ?
    `).get(promoterId);

    const monthStats = db().prepare(`
      SELECT
        COUNT(*) as month_orders,
        COALESCE(SUM(order_amount), 0) as month_sales,
        COALESCE(SUM(commission_amount), 0) as month_commission
      FROM promoter_earnings
      WHERE promoter_id = ?
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get(promoterId);

    const todayStats = db().prepare(`
      SELECT
        COUNT(*) as today_orders,
        COALESCE(SUM(order_amount), 0) as today_sales,
        COALESCE(SUM(commission_amount), 0) as today_commission
      FROM promoter_earnings
      WHERE promoter_id = ?
        AND date(created_at) = date('now')
    `).get(promoterId);

    res.json({
      code: 200,
      data: {
        customer_count: customerCount.count,
        ...earningsStats,
        month_orders: monthStats.month_orders,
        month_sales: monthStats.month_sales,
        month_commission: monthStats.month_commission,
        today_orders: todayStats.today_orders,
        today_sales: todayStats.today_sales,
        today_commission: todayStats.today_commission
      }
    });
  } catch (error) {
    console.error('获取推广统计失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取收益明细
router.get('/earnings', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'promoter') {
      return res.status(403).json({ code: 403, message: '无权限访问' });
    }

    const promoterId = req.user.id;
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    const list = db().prepare(`
      SELECT
        pe.*,
        o.order_no,
        u.nickname as customer_name
      FROM promoter_earnings pe
      JOIN orders o ON pe.order_id = o.id
      JOIN users u ON pe.customer_id = u.id
      WHERE pe.promoter_id = ?
      ORDER BY pe.created_at DESC
      LIMIT ? OFFSET ?
    `).all(promoterId, parseInt(pageSize), parseInt(offset));

    const total = db().prepare('SELECT COUNT(*) as count FROM promoter_earnings WHERE promoter_id = ?').get(promoterId);

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
    console.error('获取收益明细失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取提成配置
router.get('/commission-config', authenticate, (req, res) => {
  try {
    const typeConfig = db().prepare("SELECT config_value FROM system_config WHERE config_key = 'commission_type'").get();
    const rateConfig = db().prepare("SELECT config_value FROM system_config WHERE config_key = 'commission_rate'").get();

    res.json({
      code: 200,
      data: {
        commission_type: typeConfig ? typeConfig.config_value : 'profit',
        commission_rate: rateConfig ? parseFloat(rateConfig.config_value) : 10
      }
    });
  } catch (error) {
    console.error('获取提成配置失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取推广员提成设置（用于客户端展示）
router.get('/commission-settings', authenticate, (req, res) => {
  try {
    const typeConfig = db().prepare("SELECT config_value FROM system_config WHERE config_key = 'commission_type'").get();
    const rateConfig = db().prepare("SELECT config_value FROM system_config WHERE config_key = 'commission_rate'").get();

    const mode = typeConfig ? typeConfig.config_value : 'profit';
    const rate = rateConfig ? parseFloat(rateConfig.config_value) : 10;

    res.json({
      code: 200,
      data: {
        mode,
        rate,
        modeText: mode === 'profit' ? '毛利润 × 百分比' : '销售额 × 百分比',
        description: mode === 'profit'
          ? `收益 = (售价-成本) × ${rate}%`
          : `收益 = 售价 × ${rate}%`
      }
    });
  } catch (error) {
    console.error('获取提成设置失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 计算订单提成（内部调用）- 仅在订单完成时计算
// 公式：推广员收益 = (实际回款 - 实际支出 - 海关运输费) × 百分比
function calculateCommission(orderId) {
  try {
    const order = db().prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) return;

    // 仅在订单完成时计算提成
    if (order.status !== 'completed') {
      console.log(`订单 ${orderId} 状态为 ${order.status}，不计算提成`);
      return;
    }

    const orderUser = db().prepare('SELECT id, role, parent_id FROM users WHERE id = ?').get(order.user_id);
    if (!orderUser) return;

    let customerId = order.user_id;
    if (orderUser.role === 'operator' && orderUser.parent_id) {
      customerId = orderUser.parent_id;
      console.log(`操作员 ${order.user_id} 的订单归属于客户 ${customerId}`);
    }

    const binding = db().prepare(`
      SELECT * FROM promoter_bindings
      WHERE customer_id = ? AND status = 'active'
    `).get(customerId);

    if (!binding) return;

    const rateConfig = db().prepare("SELECT config_value FROM system_config WHERE config_key = 'commission_rate'").get();
    const commissionRate = rateConfig ? parseFloat(rateConfig.config_value) : 3;

    // 公式：(实际回款 - 实际支出 - 海关运输费) × 百分比
    const actualAmount = Number(order.actual_amount) || 0;  // 实际回款金额
    const actualCost = Number(order.actual_cost) || 0;      // 实际支出
    const customsFee = Number(order.customs_fee) || 0;     // 海关运输费
    
    const profit = actualAmount - actualCost - customsFee;
    const commissionAmount = Math.max(0, profit * (commissionRate / 100)); // 防止负数

    db().prepare(`
      INSERT INTO promoter_earnings
        (promoter_id, order_id, customer_id, order_amount, profit_amount, commission_type, commission_rate, commission_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      binding.promoter_id,
      orderId,
      customerId,
      order.total,
      profit,
      'profit',
      commissionRate,
      commissionAmount.toFixed(2)
    );

    console.log(`✅ 订单 ${orderId} 提成计算完成：${commissionAmount.toFixed(2)}元 (${commissionType} × ${commissionRate}%)`);
  } catch (error) {
    console.error('计算提成失败:', error);
  }
}

// 重新计算订单提成（用于利润更新后）- 仅在订单完成时计算
// 公式：推广员收益 = (实际回款 - 实际支出 - 海关运输费) × 百分比
function updatePromoterEarnings(orderId) {
  try {
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) return;

    // 仅在订单完成时计算/更新提成
    if (order.status !== 'completed') {
      console.log(`订单 ${orderId} 状态为 ${order.status}，不更新提成`);
      return;
    }

    const orderUser = db.prepare('SELECT id, role, parent_id FROM users WHERE id = ?').get(order.user_id);
    if (!orderUser) return;

    let customerId = order.user_id;
    if (orderUser.role === 'operator' && orderUser.parent_id) {
      customerId = orderUser.parent_id;
      console.log(`操作员 ${order.user_id} 的订单归属于客户 ${customerId}`);
    }

    const binding = db().prepare(`
      SELECT * FROM promoter_bindings
      WHERE customer_id = ? AND status = 'active'
    `).get(customerId);

    if (!binding) return;

    const rateConfig = db().prepare("SELECT config_value FROM system_config WHERE config_key = 'commission_rate'").get();
    const commissionRate = rateConfig ? parseFloat(rateConfig.config_value) : 3;

    // 公式：(实际回款 - 实际支出 - 海关运输费) × 百分比
    const actualAmount = Number(order.actual_amount) || 0;  // 实际回款金额
    const actualCost = Number(order.actual_cost) || 0;      // 实际支出
    const customsFee = Number(order.customs_fee) || 0;     // 海关运输费
    
    const profit = actualAmount - actualCost - customsFee;
    const commissionAmount = Math.max(0, profit * (commissionRate / 100)); // 防止负数

    // 检查是否已经有收益记录
    const existing = db().prepare('SELECT id FROM promoter_earnings WHERE order_id = ?').get(orderId);
    
    if (existing) {
      // 更新现有记录
      db().prepare(`
        UPDATE promoter_earnings
        SET profit_amount = ?, commission_amount = ?, updated_at = datetime('now')
        WHERE order_id = ?
      `).run(profit, commissionAmount.toFixed(2), orderId);
      
      console.log(`✅ 订单 ${orderId} 提成更新完成：${commissionAmount.toFixed(2)}元 ((${actualAmount} - ${actualCost} - ${customsFee}) × ${commissionRate}%)`);
    } else {
      // 创建新记录
      db().prepare(`
        INSERT INTO promoter_earnings
          (promoter_id, order_id, customer_id, order_amount, profit_amount, commission_type, commission_rate, commission_amount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(
        binding.promoter_id,
        orderId,
        customerId,
        order.total,
        profit,
        'profit',
        commissionRate,
        commissionAmount.toFixed(2)
      );
      
      console.log(`✅ 订单 ${orderId} 提成创建完成：${commissionAmount.toFixed(2)}元 ((${actualAmount} - ${actualCost} - ${customsFee}) × ${commissionRate}%)`);
    }
  } catch (error) {
    console.error('更新提成失败:', error);
  }
}

module.exports = { router, calculateCommission, updatePromoterEarnings };