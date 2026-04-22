const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const db = require('../db/sqlite');

// 权限定义
const PERMISSIONS = {
  dashboard: { code: 'dashboard', name: '数据统计分析', desc: '查看数据统计和分析报表' },
  user_manage: { code: 'user_manage', name: '用户管理', desc: '管理前台用户账号' },
  operator_manage: { code: 'operator_manage', name: '操作员账户管理', desc: '新增、编辑、删除操作员账户' },
  customer_manage: { code: 'customer_manage', name: '客户管理', desc: '查看和管理客户关系' },
  customer_audit: { code: 'customer_audit', name: '客户审核', desc: '审核客户信息和升级申请' },
  product_manage: { code: 'product_manage', name: '商品管理', desc: '管理商品信息' },
  category_manage: { code: 'category_manage', name: '分类管理', desc: '管理商品分类' },
  order_manage: { code: 'order_manage', name: '订单管理', desc: '查看和处理订单' },
  price_manage: { code: 'price_manage', name: '价格管理', desc: '修改利润加权和售价' },
  cost_price_manage: { code: 'cost_price_manage', name: '成本价修改', desc: '修改商品成本价' },
  distribution_manage: { code: 'distribution_manage', name: '分销管理', desc: '管理推广员和提成' },
  commission_config: { code: 'commission_config', name: '提成配置', desc: '配置提成模式和比例' },
  banner_manage: { code: 'banner_manage', name: '广告管理', desc: '管理轮播图广告' },
  admin_user_manage: { code: 'admin_user_manage', name: '后台用户管理', desc: '管理后台管理员账号' },
  permission_config: { code: 'permission_config', name: '权限配置', desc: '配置各角色权限' }
};

// 默认角色权限配置
const DEFAULT_ROLE_PERMISSIONS = {
  superadmin: [
    'dashboard', 'user_manage', 'operator_manage', 'customer_manage', 'customer_audit',
    'product_manage', 'category_manage', 'order_manage', 'price_manage', 'cost_price_manage',
    'distribution_manage', 'commission_config', 'banner_manage', 'admin_user_manage', 'permission_config'
  ],
  operation: [
    'dashboard', 'operator_manage', 'customer_manage', 'product_manage', 
    'category_manage', 'order_manage'
  ],
  finance: [
    'dashboard', 'price_manage', 'cost_price_manage', 'order_manage', 
    'distribution_manage', 'product_manage'
  ],
  operator: [
    'cost_price_manage', 'customer_audit', 'order_manage'
  ]
};

// 获取权限列表
router.get('/list', adminAuth, (req, res) => {
  try {
    res.json({
      code: 200,
      data: Object.values(PERMISSIONS)
    });
  } catch (error) {
    console.error('获取权限列表失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取默认角色权限配置
router.get('/role-defaults', adminAuth, (req, res) => {
  try {
    res.json({
      code: 200,
      data: DEFAULT_ROLE_PERMISSIONS
    });
  } catch (error) {
    console.error('获取默认角色权限失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取当前登录管理员的权限
router.get('/my-permissions', adminAuth, (req, res) => {
  try {
    const admin = req.admin;
    const role = admin.role;
    
    // 如果是超级管理员，拥有所有权限
    if (role === 'superadmin') {
      return res.json({
        code: 200,
        data: {
          role: role,
          permissions: Object.keys(PERMISSIONS),
          is_superadmin: true
        }
      });
    }

    // 获取自定义权限或默认权限
    let permissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
    
    if (admin.permissions) {
      try {
        const customPermissions = JSON.parse(admin.permissions);
        if (Array.isArray(customPermissions) && customPermissions.length > 0) {
          permissions = customPermissions;
        }
      } catch (e) {
        console.log('解析自定义权限失败，使用默认权限');
      }
    }

    res.json({
      code: 200,
      data: {
        role: role,
        permissions: permissions,
        is_superadmin: false
      }
    });
  } catch (error) {
    console.error('获取权限失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 检查是否有指定权限（中间件用）
function checkPermission(permissionCode) {
  return (req, res, next) => {
    const admin = req.admin;
    
    // 超级管理员拥有所有权限
    if (admin.role === 'superadmin') {
      return next();
    }

    // 获取权限列表
    let permissions = DEFAULT_ROLE_PERMISSIONS[admin.role] || [];
    
    if (admin.permissions) {
      try {
        const customPermissions = JSON.parse(admin.permissions);
        if (Array.isArray(customPermissions) && customPermissions.length > 0) {
          permissions = customPermissions;
        }
      } catch (e) {}
    }

    if (!permissions.includes(permissionCode)) {
      return res.status(403).json({ code: 403, message: '无权限执行此操作' });
    }

    next();
  };
}

// 更新管理员权限（仅超级管理员）
router.put('/admin/:id', adminAuth, checkPermission('permission_config'), (req, res) => {
  try {
    const { getDb } = require('../db/sqlite');
    const db = getDb();
    
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ code: 400, message: '权限格式错误' });
    }

    // 验证权限码是否有效
    const validPermissions = Object.keys(PERMISSIONS);
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      return res.status(400).json({ code: 400, message: `无效权限: ${invalidPermissions.join(', ')}` });
    }

    db.prepare('UPDATE admins SET permissions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(permissions), id);

    res.json({ code: 200, message: '权限更新成功' });
  } catch (error) {
    console.error('更新权限失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取角色说明（从现有管理员账户获取）
router.get('/roles', adminAuth, (req, res) => {
  try {
    const { getDb } = require('../db/sqlite');
    const db = getDb();
    
    // 获取所有现有管理员的角色的去重列表
    const adminRoles = db.prepare(
      `SELECT DISTINCT role FROM admins WHERE status = 1 ORDER BY role`
    ).all();
    
    // 角色信息映射
    const roleInfoMap = {
      superadmin: { name: '超级管理员', desc: '拥有系统全部权限' },
      admin: { name: '管理员', desc: '系统管理员' },
      operation: { name: '运营', desc: '负责日常运营管理' },
      finance: { name: '财务', desc: '负责财务和分销管理' },
      operator: { name: '操作员', desc: '执行基础操作任务' },
      picker: { name: '配货员', desc: '负责订单配货' },
      channel: { name: '渠道', desc: '渠道管理' }
    };
    
    // 构建角色列表
    const roles = adminRoles.map(r => {
      const info = roleInfoMap[r.role] || { name: r.role, desc: '' };
      return {
        code: r.role,
        name: info.name,
        desc: info.desc
      };
    });
    
    // 如果没有数据，返回默认角色
    if (roles.length === 0) {
      roles.push(
        { code: 'superadmin', name: '超级管理员', desc: '拥有系统全部权限' },
        { code: 'operation', name: '运营', desc: '负责日常运营管理' },
        { code: 'finance', name: '财务', desc: '负责财务和分销管理' },
        { code: 'operator', name: '操作员', desc: '执行基础操作任务' }
      );
    }

    res.json({ code: 200, data: roles });
  } catch (error) {
    console.error('获取角色列表失败:', error);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

module.exports = { router, checkPermission, PERMISSIONS, DEFAULT_ROLE_PERMISSIONS };