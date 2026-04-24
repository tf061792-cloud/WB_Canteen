const express = require('express');
const { getDb } = require('../db/sqlite');
const { userAuth } = require('../middleware/auth');

const router = express.Router();

// 获取用户收货地址列表
router.get('/', userAuth, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const addresses = db.prepare(`
      SELECT * FROM user_addresses 
      WHERE user_id = ? 
      ORDER BY is_default DESC, created_at DESC
    `).all(userId);
    
    res.json({ code: 200, data: addresses });
  } catch (error) {
    console.error('获取收货地址失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取默认收货地址
router.get('/default', userAuth, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const address = db.prepare(`
      SELECT * FROM user_addresses 
      WHERE user_id = ? AND is_default = 1
    `).get(userId);
    
    res.json({ code: 200, data: address });
  } catch (error) {
    console.error('获取默认地址失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 添加收货地址
router.post('/', userAuth, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { name, phone, address, is_default } = req.body;
    
    if (!name || !phone || !address) {
      return res.status(400).json({ code: 400, message: '请填写完整信息' });
    }
    
    // 如果设置为默认地址，先将其他地址设为非默认
    if (is_default) {
      db.prepare(`
        UPDATE user_addresses SET is_default = 0 WHERE user_id = ?
      `).run(userId);
    }
    
    const result = db.prepare(`
      INSERT INTO user_addresses (user_id, name, phone, address, is_default)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, name, phone, address, is_default ? 1 : 0);
    
    res.json({ 
      code: 200, 
      message: '添加成功',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    console.error('添加收货地址失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 修改收货地址
router.put('/:id', userAuth, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const addressId = req.params.id;
    const { name, phone, address, is_default } = req.body;
    
    // 检查地址是否属于当前用户
    const existing = db.prepare(`
      SELECT * FROM user_addresses WHERE id = ? AND user_id = ?
    `).get(addressId, userId);
    
    if (!existing) {
      return res.status(404).json({ code: 404, message: '地址不存在' });
    }
    
    // 如果设置为默认地址，先将其他地址设为非默认
    if (is_default) {
      db.prepare(`
        UPDATE user_addresses SET is_default = 0 WHERE user_id = ?
      `).run(userId);
    }
    
    db.prepare(`
      UPDATE user_addresses 
      SET name = ?, phone = ?, address = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(name, phone, address, is_default ? 1 : 0, addressId, userId);
    
    res.json({ code: 200, message: '修改成功' });
  } catch (error) {
    console.error('修改收货地址失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 设置默认收货地址
router.put('/:id/default', userAuth, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const addressId = req.params.id;
    
    // 检查地址是否属于当前用户
    const existing = db.prepare(`
      SELECT * FROM user_addresses WHERE id = ? AND user_id = ?
    `).get(addressId, userId);
    
    if (!existing) {
      return res.status(404).json({ code: 404, message: '地址不存在' });
    }
    
    // 将其他地址设为非默认
    db.prepare(`
      UPDATE user_addresses SET is_default = 0 WHERE user_id = ?
    `).run(userId);
    
    // 将指定地址设为默认
    db.prepare(`
      UPDATE user_addresses SET is_default = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(addressId, userId);
    
    res.json({ code: 200, message: '设置成功' });
  } catch (error) {
    console.error('设置默认地址失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 删除收货地址
router.delete('/:id', userAuth, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const addressId = req.params.id;
    
    const result = db.prepare(`
      DELETE FROM user_addresses WHERE id = ? AND user_id = ?
    `).run(addressId, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ code: 404, message: '地址不存在' });
    }
    
    res.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除收货地址失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
