// 管理员认证路由
const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb, saveDb } = require('../db/sqlite');
const { generateToken, adminAuth } = require('../middleware/auth');

const router = express.Router();

// 管理员登录
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const db = getDb();

    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    }

    // 查找管理员
    const admin = db.prepare(
      'SELECT * FROM admins WHERE username = ? AND status = 1'
    ).get(username);

    if (!admin) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }

    // 验证密码
    const isValid = bcrypt.compareSync(password, admin.password);
    if (!isValid) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }

    // 更新最后登录时间
    db.prepare('UPDATE admins SET last_login = datetime("now") WHERE id = ?').run(admin.id);
    saveDb();

    const token = generateToken({
      id: admin.id,
      username: admin.username,
      role: admin.role
    });

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        role: admin.role,
        token
      }
    });
  } catch (error) {
    console.error('管理员登录错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取管理员信息
router.get('/info', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const admin = db.prepare(
      'SELECT id, username, nickname, role, last_login, created_at FROM admins WHERE id = ?'
    ).get(req.admin.id);

    if (!admin) {
      return res.status(404).json({ code: 404, message: '管理员不存在' });
    }

    res.json({
      code: 200,
      data: admin
    });
  } catch (error) {
    console.error('获取管理员信息错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
