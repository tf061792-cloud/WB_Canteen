const express = require('express')
const router = express.Router()
const { getDb, saveDb } = require('../db/sqlite')
const { pickerAuth } = require('../middleware/auth')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

const JWT_SECRET = process.env.JWT_SECRET || 'canteen-secret-key-2024'

// 配货员登录
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const db = getDb()
    
    const admin = db.prepare(
      'SELECT * FROM admins WHERE username = ? AND role = ?'
    ).get(username, 'picker')
    
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' })
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      code: 200,
      data: {
        token,
        user: {
          id: admin.id,
          username: admin.username,
          nickname: admin.nickname,
          role: admin.role
        }
      }
    })
  } catch (error) {
    console.error('配货员登录错误:', error)
    res.status(500).json({ code: 500, message: '登录失败' })
  }
})

// 获取配货员信息
router.get('/auth/profile', pickerAuth, async (req, res) => {
  try {
    const db = getDb()
    const admin = db.prepare('SELECT id, username, nickname, role FROM admins WHERE id = ?').get(req.user.id)
    
    if (!admin) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }
    
    res.json({ success: true, data: admin })
  } catch (error) {
    console.error('获取配货员信息错误:', error)
    res.status(500).json({ success: false, message: '获取信息失败' })
  }
})

// 获取待配货订单列表
router.get('/orders', pickerAuth, async (req, res) => {
  try {
    const { status = 'confirmed', search = '' } = req.query
    const db = getDb()
    
    // 支持多状态查询
    const statuses = Array.isArray(status) ? status : status.split(',').map(s => s.trim())
    
    let sql = `
      SELECT 
        o.id, o.order_no, o.total as total_amount, o.status, o.created_at,
        o.actual_cost, o.actual_amount, o.profit_amount,
        u.id as user_id, u.username, u.nickname
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.status IN (${statuses.map(() => '?').join(',')})
    `
    const params = [...statuses]
    
    if (search) {
      sql += ` AND (o.order_no LIKE ? OR u.username LIKE ? OR u.nickname LIKE ?)`
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    
    sql += ` ORDER BY o.created_at DESC`
    
    console.log('[picker/orders] 查询SQL:', sql)
    console.log('[picker/orders] 查询参数:', params)
    
    const orders = db.prepare(sql).all(...params)
    
    // 获取每个订单的商品详情
    for (const order of orders) {
      const items = db.prepare(`
        SELECT oi.id, oi.product_id, oi.product_name, oi.name_th, oi.specs as specification, oi.price, oi.quantity, oi.actual_qty, oi.unit
        FROM order_items oi
        WHERE oi.order_id = ?
      `).all(order.id)
      order.items = items
    }
    
    console.log('[picker/orders] 查询结果数量:', orders.length)
    
    res.json({ success: true, data: orders })
  } catch (error) {
    console.error('获取配货订单列表错误:', error.message, error.stack)
    res.status(500).json({ success: false, message: '获取订单列表失败: ' + error.message })
  }
})

// 获取订单详情
router.get('/orders/:id', pickerAuth, async (req, res) => {
  try {
    const { id } = req.params
    const db = getDb()
    
    const order = db.prepare(`
      SELECT 
        o.*,
        u.username, u.nickname
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `).get(id)
    
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' })
    }
    
    // 获取订单商品（优先使用配货端更新的商品信息）
    const items = db.prepare(`
      SELECT 
        oi.*, 
        COALESCE(oi.picked_product_name, oi.product_name, p.name) as product_name, 
        COALESCE(oi.picked_name_th, oi.name_th, p.name_th) as name_th, 
        COALESCE(oi.actual_qty, oi.quantity) as actual_qty,
        COALESCE(oi.unit, p.unit) as unit, 
        COALESCE(oi.specs, p.specs) as specification
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(id)
    
    order.items = items
    
    res.json({ success: true, data: order })
  } catch (error) {
    console.error('获取订单详情错误:', error)
    res.status(500).json({ success: false, message: '获取订单详情失败' })
  }
})

// 提交配货单
router.post('/orders/:id/pick', pickerAuth, async (req, res) => {
  const db = getDb()
  
  try {
    const { id } = req.params
    const { items, remark } = req.body
    
    // 检查订单状态
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' })
    }
    
    if (order.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: '订单状态不正确' })
    }
    
    // 开始事务
    db.prepare('BEGIN TRANSACTION').run()
    
    try {
      // 先获取订单原有的商品列表
      const originalItems = db.prepare('SELECT id FROM order_items WHERE order_id = ?').all(id);
      
      // 创建订单商品ID到原始商品的映射
      const itemMap = {};
      originalItems.forEach(item => {
        itemMap[item.id] = item;
      });
      
      // 更新订单商品的实际配货信息
      console.log('📦 配货员提交的数据:', JSON.stringify(items, null, 2));
      for (const item of items) {
        const originalItem = itemMap[item.order_item_id];
        if (originalItem) {
          console.log(`  更新商品 ${originalItem.id}: actual_qty=${item.actual_qty}, product_id=${item.product_id}, product_name=${item.product_name}, name_th=${item.name_th}, price=${item.price}, unit=${item.unit}`);
          db.prepare(
            'UPDATE order_items SET product_id = ?, actual_qty = ?, picked_product_name = ?, picked_name_th = ?, price = ?, unit = ? WHERE id = ?'
          ).run(
            item.product_id,
            item.actual_qty, 
            item.product_name || null, 
            item.name_th || null,
            item.price || null, 
            item.unit || null, 
            originalItem.id
          );
        } else if (item.order_item_id && item.order_item_id.startsWith('new_')) {
          // 处理临时补充的商品，插入新记录
          console.log(`  插入新商品: product_id=${item.product_id}, actual_qty=${item.actual_qty}, product_name=${item.product_name}, name_th=${item.name_th}, price=${item.price}, unit=${item.unit}`);
          const insertResult = db.prepare(
            'INSERT INTO order_items (order_id, product_id, product_name, name_th, price, quantity, actual_qty, unit, picked_product_name, picked_name_th) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).run(
            id,
            item.product_id || null,
            item.product_name || null,
            item.name_th || null,
            item.price || null,
            item.actual_qty,
            item.actual_qty,
            item.unit || null,
            item.product_name || null,
            item.name_th || null
          );
          console.log(`  插入结果:`, insertResult);
        }
      }
      console.log('✅ 配货数量更新完成');
      
      // 更新订单状态为已配货（待管理端确认发货）
      const updateResult = db.prepare(`
        UPDATE orders 
        SET status = 'picked', 
            picked_by = ?,
            picked_at = datetime('now'),
            picker_remark = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(req.user.id, remark || null, id);
      
      console.log('✅ 订单状态更新结果:', updateResult);
      
      db.prepare('COMMIT').run()
      
      // 保存数据库变更
      await saveDb()
      console.log('✅ 数据库保存成功')
      
      res.json({ success: true, message: '配货单提交成功' })
    } catch (err) {
      db.prepare('ROLLBACK').run()
      throw err
    }
  } catch (error) {
    console.error('提交配货单错误:', error)
    res.status(500).json({ success: false, message: '提交配货单失败' })
  }
})

// 获取商品列表（配货端使用）
router.get('/products', pickerAuth, async (req, res) => {
  try {
    const db = getDb()
    
    const products = db.prepare(`
      SELECT id, name, name_th, price, unit, specs, image
      FROM products
      WHERE status = 'active'
      ORDER BY name
    `).all()
    
    res.json({ success: true, data: products })
  } catch (error) {
    console.error('获取商品列表错误:', error)
    res.status(500).json({ success: false, message: '获取商品列表失败' })
  }
})

// 获取配货历史
router.get('/history', pickerAuth, async (req, res) => {
  try {
    const db = getDb()
    const pickerId = req.user.id
    
    const orders = db.prepare(`
      SELECT 
        o.id, o.order_no, o.total_amount, o.status, o.created_at, o.picked_at,
        u.username, u.nickname
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.picked_by = ?
      ORDER BY o.picked_at DESC
    `).all(pickerId)
    
    res.json({ success: true, data: orders })
  } catch (error) {
    console.error('获取配货历史错误:', error)
    res.status(500).json({ success: false, message: '获取配货历史失败' })
  }
})

module.exports = router
