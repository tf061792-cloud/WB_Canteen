// 轮播图路由
const express = require('express');
const { getDb, saveDb } = require('../db/sqlite');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// 获取轮播图
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { position = 'home' } = req.query;

    const banners = db.prepare(
      'SELECT * FROM banners WHERE position = ? AND status = "active" ORDER BY sort_order ASC'
    ).all(position);

    res.json({
      code: 200,
      data: banners
    });
  } catch (error) {
    console.error('获取轮播图错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 管理端：添加轮播图
router.post('/', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { title, image, link, position, sort_order } = req.body;

    if (!image) {
      return res.status(400).json({ code: 400, message: '图片不能为空' });
    }

    const result = db.prepare(
      'INSERT INTO banners (title, image, link, position, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run(title, image, link || '', position || 'home', sort_order || 0);
    
    saveDb();

    res.json({
      code: 200,
      message: '添加成功',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    console.error('添加轮播图错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 管理端：更新轮播图
router.put('/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { title, image, link, position, sort_order, status } = req.body;

    const result = db.prepare(`
      UPDATE banners SET 
       title = COALESCE(?, title),
       image = COALESCE(?, image),
       link = COALESCE(?, link),
       position = COALESCE(?, position),
       sort_order = COALESCE(?, sort_order),
       status = COALESCE(?, status)
       WHERE id = ?
    `).run(title, image, link, position, sort_order, status, id);

    if (result.changes === 0) {
      return res.status(404).json({ code: 404, message: '轮播图不存在' });
    }
    
    saveDb();

    res.json({
      code: 200,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新轮播图错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 管理端：删除轮播图
router.delete('/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const result = db.prepare('DELETE FROM banners WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ code: 404, message: '轮播图不存在' });
    }
    
    saveDb();

    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除轮播图错误:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
