const express = require('express');
const router = express.Router();
const { getDb } = require('../db/sqlite');
const bcrypt = require('bcryptjs');
const { adminAuth } = require('../middleware/auth');
const { clearRelatedCaches } = require('../utils/cache');

// 获取管理员列表
router.get('/', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    // 获取总数
    const countResult = db.prepare('SELECT COUNT(*) as total FROM admins').get();
    const total = countResult?.total || 0;
    
    // 获取列表
    const list = db.prepare(
      `SELECT id, username, nickname, role, status, created_at, updated_at
      FROM admins
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`
    ).all(parseInt(pageSize), offset);
    
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
    console.error('获取管理员列表失败:', error.message);
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message });
  }
});

// 创建管理员
router.post('/', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { username, password, nickname, role = 'operator' } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码必填' });
    }
    
    // 检查用户名是否已存在
    const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ code: 400, message: '用户名已存在' });
    }
    
    // 加密密码
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const result = db.prepare(
      'INSERT INTO admins (username, password, nickname, role, status) VALUES (?, ?, ?, ?, 1)'
    ).run(username, hashedPassword, nickname || username, role);

    // 清除管理员缓存
    clearRelatedCaches.users();

    res.json({
      code: 200,
      message: '创建成功',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    console.error('创建管理员失败:', error.message);
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message });
  }
});

// 更新管理员
router.put('/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { nickname, role, password, status } = req.body;
    
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
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (password) {
      updates.push('password = ?');
      params.push(bcrypt.hashSync(password, 10));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ code: 400, message: '没有要更新的字段' });
    }
    
    params.push(id);
    
    db.prepare(`UPDATE admins SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // 清除管理员缓存
    clearRelatedCaches.users();

    res.json({ code: 200, message: '更新成功' });
  } catch (error) {
    console.error('更新管理员失败:', error.message);
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message });
  }
});

// 删除管理员
router.delete('/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    // 不能删除自己
    db.prepare('DELETE FROM admins WHERE id = ?').run(id);

    // 清除管理员缓存
    clearRelatedCaches.users();

    res.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除管理员失败:', error.message);
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message });
  }
});

// 获取管理员详情
router.get('/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    const admin = db.prepare(
      'SELECT id, username, nickname, role, status, created_at FROM admins WHERE id = ?'
    ).get(id);
    
    if (!admin) {
      return res.status(404).json({ code: 404, message: '管理员不存在' });
    }
    
    res.json({ code: 200, data: admin });
  } catch (error) {
    console.error('获取管理员详情失败:', error.message);
    res.status(500).json({ code: 500, message: '服务器错误: ' + error.message });
  }
});

module.exports = router;
