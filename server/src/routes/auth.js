// 用户认证路由
const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb, saveDb } = require('../db/sqlite');
const { generateToken, userAuth } = require('../middleware/auth');

const router = express.Router();

// 用户注册
router.post('/register', (req, res) => {
  try {
    const { username, password, nickname, promoter_code } = req.body;
    const db = getDb();

    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ code: 400, message: '用户名长度3-20位' });
    }

    if (password.length < 6) {
      return res.status(400).json({ code: 400, message: '密码至少6位' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ code: 400, message: '用户名已存在' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    // 创建用户
    const result = db.prepare(
      'INSERT INTO users (username, password, nickname, role, promoter_code) VALUES (?, ?, ?, ?, ?)'
    ).run(username, hashedPassword, nickname || username, 'user', promoter_code || null);

    const userId = result.lastInsertRowid;

    // 如果有推广码，自动绑定推广员
    if (promoter_code) {
      const promoter = db.prepare('SELECT id FROM users WHERE promoter_code = ?').get(promoter_code);
      if (promoter) {
        // 检查是否已经绑定过
        const existingBinding = db.prepare('SELECT id FROM promoter_bindings WHERE promoter_id = ? AND customer_id = ?').get(promoter.id, userId);
        if (!existingBinding) {
          // 1. 更新用户表的 parent_id 字段
          db.prepare('UPDATE users SET parent_id = ? WHERE id = ?').run(promoter.id, userId);
          // 2. 创建绑定关系
          db.prepare('INSERT INTO promoter_bindings (promoter_id, customer_id) VALUES (?, ?)').run(promoter.id, userId);
          console.log(`✅ 新用户 ${username} 已绑定到推广员 ${promoter.id}`);
        }
      }
    }

    saveDb();

    const token = generateToken({
      id: userId,
      username,
      role: 'user'
    });

    res.json({
      code: 200,
      message: '注册成功',
      data: {
        id: userId,
        username,
        nickname: nickname || username,
        role: 'user',
        token
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 用户登录
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const db = getDb();

    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role
    });

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role,
        token
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取用户信息
router.get('/info', userAuth, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare(
      'SELECT id, username, nickname, role, created_at, promoter_code FROM users WHERE id = ?'
    ).get(req.user.id);

    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    res.json({
      code: 200,
      data: user
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 更新用户信息
router.put('/update', userAuth, (req, res) => {
  try {
    const db = getDb();
    const { nickname } = req.body;

    db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname, req.user.id);
    saveDb();

    res.json({
      code: 200,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;