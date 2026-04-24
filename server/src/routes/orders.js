// 订单路由
const express = require('express');
const { getDb, saveDb } = require('../db/sqlite');
const { userAuth, adminAuth } = require('../middleware/auth');
const { calculateCommission } = require('./promoter');
const { cache, clearRelatedCaches } = require('../utils/cache');

const router = express.Router();

// 生成订单号
function generateOrderNo(orderTitle) {
  const date = new Date();
  const dateStr = date.getFullYear().toString().substring(2) + 
                 (date.getMonth() + 1).toString().padStart(2, '0') + 
                 date.getDate().toString().padStart(2, '0');
  const timeStr = date.getHours().toString().padStart(2, '0') + 
                  date.getMinutes().toString().padStart(2, '0') + 
                  date.getSeconds().toString().padStart(2, '0');
  // 如果有订单抬头，使用订单抬头作为前缀，否则使用默认前缀
  const prefix = orderTitle ? orderTitle.replace(/\s+/g, '') : 'ORD';
  
  // 直接使用时间戳和随机数，确保绝对唯一
  const randomStr = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  const orderNo = `${prefix}${dateStr}${timeStr}${randomStr}`;
  
  console.log('生成订单号:', orderNo);
  return orderNo;
}

// 用户端：创建订单
router.post('/', userAuth, (req, res) => {
  const db = getDb();
  const { items, address, contact, phone, remark } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ code: 400, message: '订单商品不能为空' });
  }

  if (!address || !contact || !phone) {
    return res.status(400).json({ code: 400, message: '收货信息不完整' });
  }

  try {
    // 计算订单总金额
    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const product = db.prepare(
        'SELECT * FROM products WHERE id = ? AND status = "active"'
      ).get(item.product_id);

      if (!product) {
        throw new Error(`商品不存在: ${item.product_id}`);
      }

      const subtotal = Number(product.price) * item.quantity;
      total += subtotal;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        specs: product.specs || '',
        price: Number(product.price),
        quantity: item.quantity,
        subtotal,
        unit: product.unit || '件'
      });
    }

    // 获取用户的订单抬头
    const user = db.prepare('SELECT order_title FROM users WHERE id = ?').get(req.user.id);
    const orderTitle = user ? user.order_title : null;
    
    // 创建订单
    const orderNo = generateOrderNo(orderTitle);
    const orderResult = db.prepare(`
      INSERT INTO orders (order_no, user_id, total, address, contact, phone, remark, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(orderNo, req.user.id, total, address, contact, phone, remark || '', 'pending');

    const orderId = orderResult.lastInsertRowid;

    // 创建订单商品
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, specs, price, quantity, subtotal, unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of orderItems) {
      insertItem.run(orderId, item.product_id, item.product_name, item.specs, item.price, item.quantity, item.subtotal, item.unit);
    }

    saveDb();

    // 清除订单相关缓存
    clearRelatedCaches.orders();

    // 异步计算推广员收益（操作员订单归属于所属客户）
    setImmediate(() => {
      calculateCommission(orderId);
    });

    res.json({
      code: 200,
      message: '订单创建成功',
      data: {
        order_id: orderId,
        order_no: orderNo,
        total
      }
    });
  } catch (error) {
    console.error('创建订单错误:', error);
    res.status(500).json({ code: 500, message: error.message || '服务器错误' });
  }
});

// 用户端：获取订单列表
router.get('/', userAuth, (req, res) => {
  try {
    const db = getDb();
    const { status, page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    let sql = 'SELECT o.* FROM orders o WHERE o.user_id = ?';
    const params = [req.user.id];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), parseInt(offset));

    const orders = db.prepare(sql).all(...params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
    const countParams = [req.user.id];
    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    const countResult = db.prepare(countSql).get(...countParams);

    // 为每个订单获取商品明细，同时获取商品的单位
    const formattedOrders = orders.map(o => {
      const items = db.prepare(`
        SELECT oi.*, p.unit as product_unit, p.name_th
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `).all(o.id);
      return {
        ...o,
        total: Number(o.total),
        actual_cost: o.actual_cost ? Number(o.actual_cost) : null,
        actual_amount: o.actual_amount ? Number(o.actual_amount) : null,
        profit_amount: o.profit_amount ? Number(o.profit_amount) : null,
        customs_fee: o.customs_fee ? Number(o.customs_fee) : null,
        items: items.map(item => ({
          ...item,
          price: Number(item.price),
          subtotal: Number(item.subtotal),
          unit: item.unit || item.product_unit || '件'
        }))
      };
    });

    res.json({
      code: 200,
      data: {
        list: formattedOrders,
        total: countResult.total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取订单列表错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 用户端：获取订单详情
router.get('/:id', userAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const order = db.prepare(
      'SELECT o.* FROM orders o WHERE o.id = ? AND o.user_id = ?'
    ).get(id, req.user.id);

    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    // 获取订单商品明细（包含配货数量），同时获取商品的单位
    const items = db.prepare(`
      SELECT oi.*, p.unit as product_unit
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(order.id);

    // 获取配货员信息
    let pickerName = null;
    if (order.picked_by) {
      const picker = db.prepare('SELECT nickname FROM users WHERE id = ?').get(order.picked_by);
      pickerName = picker ? picker.nickname : null;
    }

    res.json({
      code: 200,
      data: {
        ...order,
        total: Number(order.total),
        actual_cost: order.actual_cost ? Number(order.actual_cost) : null,
        actual_amount: order.actual_amount ? Number(order.actual_amount) : null,
        profit_amount: order.profit_amount ? Number(order.profit_amount) : null,
        customs_fee: order.customs_fee ? Number(order.customs_fee) : null,
        picker_name: pickerName,
        items: items.map(item => ({
          ...item,
          price: Number(item.price),
          actual_qty: item.actual_qty || item.quantity,
          subtotal: Number(item.subtotal),
          unit: item.unit || item.product_unit || '件'
        }))
      }
    });
  } catch (error) {
    console.error('获取订单详情错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 管理端：获取所有订单 (SQLite 兼容版本)
router.get('/admin/list', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { status, page = 1, pageSize = 10, keyword } = req.query;
    const offset = (page - 1) * pageSize;

    // 构建基础查询 (SQLite 兼容)
    let whereClause = 'WHERE 1=1';
    const params = [];
    const countParams = [];

    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (keyword) {
      whereClause += ' AND (o.order_no LIKE ? OR u.username LIKE ? OR u.nickname LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      countParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    // 查询订单列表
    let sql = `
      SELECT o.*, u.username, u.nickname as user_nickname,
             picker.username as picked_by_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN admins picker ON o.picked_by = picker.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;  
    
    const orders = db.prepare(sql).all(...params, parseInt(pageSize), parseInt(offset));

    // 查询总数
    const countSql = `
      SELECT COUNT(*) as total FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
    `;
    const countResult = db.prepare(countSql).get(...countParams);

    // 获取所有订单的 items，同时获取商品的单位
    const orderIds = orders.map(o => o.id);
    let orderItemsMap = {};

    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');
      const items = db.prepare(`
        SELECT oi.*, p.unit as product_unit, p.name_th
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id IN (${placeholders})
      `).all(...orderIds);

      // 按 order_id 分组
      items.forEach(item => {
        if (!orderItemsMap[item.order_id]) {
          orderItemsMap[item.order_id] = [];
        }
        orderItemsMap[item.order_id].push({
          id: item.id,
          product_id: item.product_id,
          product_name: item.picked_product_name || item.product_name,
          name_th: item.picked_name_th || item.name_th,
          specs: item.specs,
          price: Number(item.price),
          quantity: item.quantity,
          actual_qty: item.actual_qty || item.quantity,
          subtotal: Number(item.subtotal),
          unit: item.unit || item.product_unit || '件'
        });
      });
    }

    // 组装数据
    const formattedOrders = orders.map(o => {
      const items = orderItemsMap[o.id] || [];
      // 检查是否有数量差异
      const hasDifference = items.some(item => {
        const actualQty = item.actual_qty || item.quantity;
        return actualQty !== item.quantity;
      });
      return {
        ...o,
        total: Number(o.total),
        actual_cost: o.actual_cost ? Number(o.actual_cost) : null,
        actual_amount: o.actual_amount ? Number(o.actual_amount) : null,
        profit_amount: o.profit_amount ? Number(o.profit_amount) : null,
        customs_fee: o.customs_fee ? Number(o.customs_fee) : null,
        items,
        hasDifference
      };
    });

    res.json({
      code: 200,
      data: {
        list: formattedOrders,
        total: countResult.total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取订单列表错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 管理端：更新订单状态和财务信息
router.put('/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status, actual_cost, actual_amount, profit_amount, picker_note, picked_items } = req.body;

    // 开始事务
    db.prepare('BEGIN TRANSACTION').run();

    try {
      const updates = [];
      const params = [];

      if (status) {
        updates.push('status = ?');
        params.push(status);

        // 当状态更新为已发货(shipped)时，将配货数据（表单B）覆盖到原始订单数据（表单A）
        if (status === 'shipped') {
          console.log('📦 确认发货：将配货数据覆盖到原始订单数据');
          
          // 获取订单的配货数据
          const orderItems = db.prepare('SELECT id, actual_qty, picked_product_name, picked_name_th, price, unit FROM order_items WHERE order_id = ?').all(id);
          
          // 更新每个商品的原始数据为配货数据
          for (const item of orderItems) {
            if (item.actual_qty) {
              db.prepare(`
                UPDATE order_items
                SET quantity = ?, product_name = ?, name_th = ?, price = ?, unit = ?
                WHERE id = ?
              `).run(
                item.actual_qty,
                item.picked_product_name || item.product_name,
                item.picked_name_th || item.name_th,
                item.price,
                item.unit,
                item.id
              );
              console.log(`  更新商品 ${item.id}: 数量=${item.actual_qty}, 名称=${item.picked_product_name || item.product_name}`);
            }
          }
        }
      }

      if (actual_cost !== undefined) {
        updates.push('actual_cost = ?');
        params.push(actual_cost);
      }

      if (actual_amount !== undefined) {
        updates.push('actual_amount = ?');
        params.push(actual_amount);
      }

      if (profit_amount !== undefined) {
    updates.push('profit_amount = ?');
    params.push(profit_amount);
  }

  if (req.body.customs_fee !== undefined) {
    updates.push('customs_fee = ?');
    params.push(req.body.customs_fee);
  }

      if (picker_note !== undefined) {
        updates.push('picker_remark = ?');
        params.push(picker_note);
      }

      if (updates.length === 0) {
        db.prepare('ROLLBACK').run();
        return res.status(400).json({ code: 400, message: '没有需要更新的字段' });
      }

      updates.push('updated_at = datetime("now")');
      params.push(id);

      const result = db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`).run(...params);

      if (result.changes === 0) {
        db.prepare('ROLLBACK').run();
        return res.status(404).json({ code: 404, message: '订单不存在' });
      }

      // 保存配货明细
      if (picked_items && Array.isArray(picked_items) && picked_items.length > 0) {
        console.log('📋 管理端提交的配货数据:', JSON.stringify(picked_items, null, 2));
        const updateItem = db.prepare(`
          UPDATE order_items
          SET actual_qty = ?
          WHERE order_id = ? AND product_id = ?
        `);

        for (const item of picked_items) {
          console.log(`  更新商品 product_id=${item.product_id}: picked_quantity=${item.picked_quantity}`);
          updateItem.run(item.picked_quantity || 0, id, item.product_id);
        }
      }

      // 提交事务
      db.prepare('COMMIT').run();

      saveDb();

      // 清除订单相关缓存
      clearRelatedCaches.orders();

      res.json({
        code: 200,
        message: '更新成功'
      });
    } catch (error) {
      // 回滚事务
      db.prepare('ROLLBACK').run();
      console.error('更新订单错误:', error);
      res.status(500).json({ code: 500, message: '服务器错误' });
    }
  } catch (error) {
    console.error('更新订单错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 管理端：获取订单统计数据
router.get('/admin/stats', adminAuth, (req, res) => {
  try {
    const db = getDb();
    
    // 总订单数
    const totalResult = db.prepare('SELECT COUNT(*) as total FROM orders').get();
    
    // 各状态订单数
    const statusResult = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      GROUP BY status
    `).all();
    
    // 今日订单数
    const todayResult = db.prepare(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE DATE(created_at) = DATE('now')
    `).get();
    
    // 本月订单数
    const monthResult = db.prepare(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get();
    
    // 今日销售额
    const todaySalesResult = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as sales 
      FROM orders 
      WHERE DATE(created_at) = DATE('now')
    `).get();
    
    // 本月销售额
    const monthSalesResult = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as sales 
      FROM orders 
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get();

    // 利润统计
    const profitResult = db.prepare(`
      SELECT 
        COALESCE(SUM(profit_amount), 0) as total_profit,
        COUNT(*) as profit_order_count
      FROM orders 
      WHERE profit_amount IS NOT NULL
    `).get();

    const statusMap = {};
    statusResult.forEach(s => {
      statusMap[s.status] = s.count;
    });

    res.json({
      code: 200,
      data: {
        total_orders: totalResult.total,
        today_orders: todayResult.count,
        month_orders: monthResult.count,
        today_sales: Number(todaySalesResult.sales),
        month_sales: Number(monthSalesResult.sales),
        total_profit: Number(profitResult.total_profit),
        profit_order_count: profitResult.profit_order_count,
        status_breakdown: statusMap
      }
    });
  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 用户端：确认订单
router.post('/:id/confirm', userAuth, (req, res) => {
  try {
    console.log('✅ 用户确认订单请求 - orderId:', req.params.id, 'userId:', req.user.id);
    const db = getDb();
    const { id } = req.params;

    const order = db.prepare(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?'
    ).get(id, req.user.id);
    console.log('✅ 查询到的订单:', order);

    if (!order) {
      console.log('❌ 订单不存在或不是该用户的订单');
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    if (order.status !== 'pending') {
      console.log('❌ 订单状态不允许确认，当前状态:', order.status);
      return res.status(400).json({ code: 400, message: '订单状态不允许确认' });
    }

    console.log('✅ 开始更新订单状态为confirmed');
    db.prepare(
      'UPDATE orders SET status = ?, updated_at = datetime("now") WHERE id = ?'
    ).run('confirmed', id);

    saveDb();
    console.log('✅ 数据库保存成功');

    // 清除订单相关缓存
    clearRelatedCaches.orders();
    console.log('✅ 缓存清除成功');

    res.json({ code: 200, message: '订单确认成功' });
  } catch (error) {
    console.error('❌ 确认订单错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message });
  }
});

// 用户端：取消订单
router.post('/:id/cancel', userAuth, (req, res) => {
  try {
    console.log('❌ 用户取消订单请求 - orderId:', req.params.id, 'userId:', req.user.id);
    const db = getDb();
    const { id } = req.params;

    const order = db.prepare(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?'
    ).get(id, req.user.id);
    console.log('❌ 查询到的订单:', order);

    if (!order) {
      console.log('❌ 订单不存在或不是该用户的订单');
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    if (!['pending', 'confirmed', 'picked'].includes(order.status)) {
      console.log('❌ 订单状态不允许取消，当前状态:', order.status);
      return res.status(400).json({ code: 400, message: '订单状态不允许取消' });
    }

    console.log('✅ 开始更新订单状态为cancelled');
    db.prepare(
      'UPDATE orders SET status = ?, updated_at = datetime("now") WHERE id = ?'
    ).run('cancelled', id);

    saveDb();
    console.log('✅ 数据库保存成功');

    // 清除订单相关缓存
    clearRelatedCaches.orders();
    console.log('✅ 缓存清除成功');

    res.json({ code: 200, message: '订单取消成功' });
  } catch (error) {
    console.error('❌ 取消订单错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message });
  }
});

// 用户端：确认收货
router.post('/:id/receive', userAuth, (req, res) => {
  try {
    console.log('📦 用户确认收货请求 - orderId:', req.params.id, 'userId:', req.user.id);
    const db = getDb();
    const { id } = req.params;

    const order = db.prepare(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?'
    ).get(id, req.user.id);
    console.log('📦 查询到的订单:', order);

    if (!order) {
      console.log('❌ 订单不存在或不是该用户的订单');
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    if (order.status !== 'shipped') {
      console.log('❌ 订单状态不允许确认收货，当前状态:', order.status);
      return res.status(400).json({ code: 400, message: '订单状态不允许确认收货' });
    }

    console.log('✅ 开始更新订单状态为completed');
    db.prepare(
      'UPDATE orders SET status = ?, updated_at = datetime("now") WHERE id = ?'
    ).run('completed', id);

    saveDb();
    console.log('✅ 数据库保存成功');

    // 清除订单相关缓存
    clearRelatedCaches.orders();
    console.log('✅ 缓存清除成功');

    res.json({ code: 200, message: '确认收货成功' });
  } catch (error) {
    console.error('❌ 确认收货错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message });
  }
});

// 管理端：发货
router.post('/:id/ship', adminAuth, (req, res) => {
  try {
    console.log('📦 发货请求 - orderId:', req.params.id);
    const db = getDb();
    const { id } = req.params;

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    console.log('📦 查询到的订单:', order);

    if (!order) {
      console.log('❌ 订单不存在');
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    if (order.status !== 'picked') {
      console.log('❌ 订单状态不允许发货，当前状态:', order.status);
      return res.status(400).json({ code: 400, message: '订单状态不允许发货' });
    }

    console.log('✅ 开始更新订单状态为shipped');
    const result = db.prepare(
      'UPDATE orders SET status = ?, updated_at = datetime("now") WHERE id = ?'
    ).run('shipped', id);
    console.log('✅ 更新结果:', result);

    saveDb();
    console.log('✅ 数据库保存成功');

    // 清除订单相关缓存
    clearRelatedCaches.orders();
    console.log('✅ 缓存清除成功');

    res.json({ code: 200, message: '发货成功' });
  } catch (error) {
    console.error('❌ 发货错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message });
  }
});

// 管理端：确认订单
router.post('/:id/confirm', adminAuth, (req, res) => {
  try {
    console.log('✅ 确认订单请求 - orderId:', req.params.id);
    const db = getDb();
    const { id } = req.params;

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    console.log('✅ 查询到的订单:', order);

    if (!order) {
      console.log('❌ 订单不存在');
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    if (order.status !== 'pending') {
      console.log('❌ 订单状态不允许确认，当前状态:', order.status);
      return res.status(400).json({ code: 400, message: '订单状态不允许确认' });
    }

    console.log('✅ 开始更新订单状态为confirmed');
    db.prepare(
      'UPDATE orders SET status = ?, updated_at = datetime("now") WHERE id = ?'
    ).run('confirmed', id);

    saveDb();
    console.log('✅ 数据库保存成功');

    // 清除订单相关缓存
    clearRelatedCaches.orders();
    console.log('✅ 缓存清除成功');

    res.json({ code: 200, message: '订单确认成功' });
  } catch (error) {
    console.error('❌ 确认订单错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message });
  }
});

// 管理端：取消订单
router.post('/:id/cancel', adminAuth, (req, res) => {
  try {
    console.log('❌ 取消订单请求 - orderId:', req.params.id);
    const db = getDb();
    const { id } = req.params;

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    console.log('❌ 查询到的订单:', order);

    if (!order) {
      console.log('❌ 订单不存在');
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    if (!['pending', 'confirmed', 'picked'].includes(order.status)) {
      console.log('❌ 订单状态不允许取消，当前状态:', order.status);
      return res.status(400).json({ code: 400, message: '订单状态不允许取消' });
    }

    console.log('✅ 开始更新订单状态为cancelled');
    db.prepare(
      'UPDATE orders SET status = ?, updated_at = datetime("now") WHERE id = ?'
    ).run('cancelled', id);

    saveDb();
    console.log('✅ 数据库保存成功');

    // 清除订单相关缓存
    clearRelatedCaches.orders();
    console.log('✅ 缓存清除成功');

    res.json({ code: 200, message: '订单取消成功' });
  } catch (error) {
    console.error('❌ 取消订单错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message });
  }
});

// 管理端：完成订单
router.post('/:id/complete', adminAuth, (req, res) => {
  try {
    console.log('🎉 完成订单请求 - orderId:', req.params.id);
    const db = getDb();
    const { id } = req.params;

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    console.log('🎉 查询到的订单:', order);

    if (!order) {
      console.log('❌ 订单不存在');
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    if (order.status !== 'shipped') {
      console.log('❌ 订单状态不允许完成，当前状态:', order.status);
      return res.status(400).json({ code: 400, message: '订单状态不允许完成' });
    }

    console.log('✅ 开始更新订单状态为completed');
    db.prepare(
      'UPDATE orders SET status = ?, updated_at = datetime("now") WHERE id = ?'
    ).run('completed', id);

    saveDb();
    console.log('✅ 数据库保存成功');

    // 清除订单相关缓存
    clearRelatedCaches.orders();
    console.log('✅ 缓存清除成功');

    res.json({ code: 200, message: '订单完成' });
  } catch (error) {
    console.error('❌ 完成订单错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message });
  }
});

// 管理端：修改订单明细（数量和金额）
router.post('/admin/:id/update-items', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { items } = req.body;

    console.log('📋 [更新订单明细] 收到请求:');
    console.log('📋 订单ID:', id);
    console.log('📋 items数据:', items);
    console.log('📋 items类型:', typeof items);
    console.log('📋 items是否为数组:', Array.isArray(items));
    console.log('📋 items数量:', items?.length || 0);

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('❌ 商品明细验证失败');
      return res.status(400).json({ code: 400, message: '商品明细不能为空' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

    if (!order) {
      console.log('❌ 订单不存在:', id);
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    console.log('✅ 找到订单:', order.order_no);

    // 开始事务
    let total = 0;

    // 删除原有商品明细
    console.log('🗑️ 删除原有商品明细');
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id);

    // 插入新的商品明细
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, product_name, name_th, specs, price, quantity, actual_qty, unit, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    for (const item of items) {
      console.log('📦 处理商品:', item);
      const subtotal = (item.price || 0) * (item.quantity || 0);
      total += subtotal;

      insertItem.run(
        id,
        item.product_id || 0,
        item.product_name || '',
        item.name_th || '',
        item.specs || '',
        item.price || 0,
        item.quantity || 0,
        item.actual_qty !== undefined ? item.actual_qty : item.quantity || 0,
        item.unit || '',
        subtotal
      );
      console.log('✅ 插入商品:', item.product_name, '数量:', item.quantity, '小计:', subtotal);
    }

    // 更新订单总金额
    console.log('💵 更新订单总金额:', total);
    db.prepare(
      'UPDATE orders SET total = ?, updated_at = datetime("now") WHERE id = ?'
    ).run(total, id);

    saveDb();

    // 清除订单相关缓存
    clearRelatedCaches.orders();

    console.log('✅ 更新订单明细成功');
    res.json({ code: 200, message: '订单明细更新成功', data: { total } });
  } catch (error) {
    console.error('❌ 更新订单明细错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 管理端：配货确认（保存配货明细并更新订单状态为已配货）
router.post('/admin/:id/pick', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { items, remark, pickedBy } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ code: 400, message: '配货明细不能为空' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    if (order.status !== 'confirmed') {
      return res.status(400).json({ code: 400, message: '订单状态不允许配货' });
    }

    // 更新每个订单项的实际配货数量
    for (const item of items) {
      db.prepare(
        'UPDATE order_items SET actual_qty = ? WHERE id = ? AND order_id = ?'
      ).run(item.actualQty || item.quantity, item.id, id);
    }

    // 更新订单状态为已配货(picked)
    db.prepare(
      'UPDATE orders SET status = ?, picked_by = ?, picked_at = datetime("now"), picker_remark = ?, updated_at = datetime("now") WHERE id = ?'
    ).run('picked', pickedBy || null, remark || null, id);

    saveDb();

    // 清除订单相关缓存
    clearRelatedCaches.orders();

    res.json({ code: 200, message: '配货确认成功，订单已配货' });
  } catch (error) {
    console.error('配货确认错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;  
