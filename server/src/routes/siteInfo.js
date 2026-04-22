const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');

// 网站基本信息配置项
const SITE_INFO_KEYS = [
  'site_name',
  'site_logo',
  'site_description',
  'contact_phone',
  'contact_email',
  'contact_address',
  'business_hours',
  'delivery_note',
  'copyright',
  'icp',
  'site_notice'
];

// 获取网站基本信息（公开接口）
router.get('/info', async (req, res) => {
  try {
    const { getDb } = require('../db/sqlite');
    const db = getDb();
    
    const config = db.prepare(`
      SELECT config_key, config_value FROM system_config 
      WHERE config_key IN (${SITE_INFO_KEYS.map(() => '?').join(',')})
    `).all(...SITE_INFO_KEYS);
    
    const siteInfo = {};
    SITE_INFO_KEYS.forEach(key => {
      const item = config.find(c => c.config_key === key);
      siteInfo[key] = item ? item.config_value : getDefaultValue(key);
    });
    
    res.json({
      code: 200,
      data: siteInfo
    });
  } catch (error) {
    console.error('获取网站信息失败:', error);
    res.status(500).json({ code: 500, message: '获取网站信息失败' });
  }
});

// 更新网站基本信息（需要认证）
router.put('/info', adminAuth, async (req, res) => {
  try {
    const { getDb } = require('../db/sqlite');
    const db = getDb();
    const updates = req.body;
    
    // 只允许更新白名单中的字段
    const allowedKeys = Object.keys(updates).filter(key => SITE_INFO_KEYS.includes(key));
    
    if (allowedKeys.length === 0) {
      return res.status(400).json({ code: 400, message: '没有有效的更新字段' });
    }
    
    // 使用事务批量更新
    const updateStmt = db.prepare(`
      UPDATE system_config 
      SET config_value = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE config_key = ?
    `);
    
    const insertStmt = db.prepare(`
      INSERT INTO system_config (config_key, config_value, description) 
      VALUES (?, ?, ?)
    `);
    
    const descriptions = {
      site_name: '网站名称',
      site_logo: '网站Logo',
      site_description: '网站简介',
      contact_phone: '联系电话',
      contact_email: '联系邮箱',
      contact_address: '联系地址',
      business_hours: '营业时间',
      delivery_note: '配送说明',
      copyright: '版权信息',
      icp: 'ICP备案号',
      site_notice: '网站公告'
    };
    
    for (const key of allowedKeys) {
      const value = updates[key] || '';
      const exists = db.prepare('SELECT id FROM system_config WHERE config_key = ?').get(key);
      
      if (exists) {
        updateStmt.run(value, key);
      } else {
        insertStmt.run(key, value, descriptions[key] || key);
      }
    }
    
    res.json({
      code: 200,
      message: '网站信息更新成功'
    });
  } catch (error) {
    console.error('更新网站信息失败:', error);
    res.status(500).json({ code: 500, message: '更新网站信息失败' });
  }
});

// 获取默认值
function getDefaultValue(key) {
  const defaults = {
    site_name: 'WB食堂食材下单系统',
    site_description: '专业的食堂食材采购平台',
    contact_phone: '',
    contact_email: '',
    contact_address: '',
    business_hours: '08:00 - 18:00',
    delivery_note: '当日下单，次日配送',
    copyright: '© 2024 WB食堂 版权所有',
    icp: '',
    site_notice: ''
  };
  return defaults[key] || '';
}

module.exports = router;
