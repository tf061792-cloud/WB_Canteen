const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const { checkPermission } = require('./permissions');
const { getDb } = require('../db/sqlite');
const { clearRelatedCaches } = require('../utils/cache');

// 获取轮播图列表（管理端）
router.get('/list', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { page = 1, pageSize = 10, status, position } = req.query;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (position) {
      whereClause += ' AND position = ?';
      params.push(position);
    }

    const list = db.prepare(`
      SELECT * FROM banners
      ${whereClause}
      ORDER BY sort_order ASC, id DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), parseInt(offset));

    const countParams = [...params];
    const total = db.prepare(`SELECT COUNT(*) as count FROM banners ${whereClause}`).get(...countParams);

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
    console.error('获取轮播图列表失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取轮播图详情
router.get('/:id', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(id);

    if (!banner) {
      return res.status(404).json({ code: 404, message: '轮播图不存在' });
    }

    res.json({ code: 200, data: banner });
  } catch (error) {
    console.error('获取轮播图详情失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 创建轮播图
router.post('/', adminAuth, checkPermission('banner_manage'), (req, res) => {
  try {
    const db = getDb();
    const { title, image, link, position = 'home', sort_order = 1, status = 'active' } = req.body;

    if (!title || !image) {
      return res.status(400).json({ code: 400, message: '标题和图片不能为空' });
    }

    const result = db.prepare(`
      INSERT INTO banners (title, image, link, position, sort_order, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(title, image, link || '', position, sort_order, status);

    // 清除轮播图缓存
    clearRelatedCaches.banners();

    res.json({
      code: 200,
      message: '创建成功',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    console.error('创建轮播图失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 更新轮播图
router.put('/:id', adminAuth, checkPermission('banner_manage'), (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { title, image, link, position, sort_order, status } = req.body;

    const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(id);
    if (!banner) {
      return res.status(404).json({ code: 404, message: '轮播图不存在' });
    }

    db.prepare(`
      UPDATE banners 
      SET title = COALESCE(?, title),
          image = COALESCE(?, image),
          link = COALESCE(?, link),
          position = COALESCE(?, position),
          sort_order = COALESCE(?, sort_order),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, image, link, position, sort_order, status, id);

    // 清除轮播图缓存
    clearRelatedCaches.banners();

    res.json({ code: 200, message: '更新成功' });
  } catch (error) {
    console.error('更新轮播图失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 删除轮播图
router.delete('/:id', adminAuth, checkPermission('banner_manage'), (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(id);
    if (!banner) {
      return res.status(404).json({ code: 404, message: '轮播图不存在' });
    }

    db.prepare('DELETE FROM banners WHERE id = ?').run(id);

    // 清除轮播图缓存
    clearRelatedCaches.banners();

    res.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除轮播图失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 批量更新排序
router.post('/update-sort', adminAuth, checkPermission('banner_manage'), (req, res) => {
  try {
    const db = getDb();
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ code: 400, message: '参数格式错误' });
    }

    const stmt = db.prepare('UPDATE banners SET sort_order = ? WHERE id = ?');
    
    items.forEach(item => {
      stmt.run(item.sort_order, item.id);
    });

    // 清除轮播图缓存
    clearRelatedCaches.banners();

    res.json({ code: 200, message: '排序更新成功' });
  } catch (error) {
    console.error('更新排序失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;