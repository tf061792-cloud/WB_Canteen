import { useState, useEffect } from 'react';
import { adminAPI } from '../api/index';

const ROLE_NAMES = {
  superadmin: '超级管理员',
  admin: '管理员',
  finance: '财务',
  operation: '运营',
  operator: '操作员',
  picker: '配货员',
  channel: '渠道'
};

const PERMISSION_GROUPS = [
  {
    name: '数据统计',
    permissions: [
      { key: 'dashboard', label: '数据看板' },
      { key: 'statistics', label: '统计分析' }
    ]
  },
  {
    name: '用户管理',
    permissions: [
      { key: 'admin_users', label: '后台用户管理' },
      { key: 'customer_manage', label: '客户管理' },
      { key: 'customer_audit', label: '客户审核' }
    ]
  },
  {
    name: '商品管理',
    permissions: [
      { key: 'products', label: '商品管理' },
      { key: 'categories', label: '分类管理' },
      { key: 'pricing', label: '价格管理' }
    ]
  },
  {
    name: '订单管理',
    permissions: [
      { key: 'orders', label: '订单管理' },
      { key: 'order_export', label: '订单导出' }
    ]
  },
  {
    name: '分销管理',
    permissions: [
      { key: 'distribution', label: '分销管理' },
      { key: 'promoter_manage', label: '推广员管理' }
    ]
  },
  {
    name: '系统管理',
    permissions: [
      { key: 'banners', label: '广告管理' },
      { key: 'permissions', label: '权限配置' }
    ]
  }
];

// 固定角色列表
const FIXED_ROLES = [
  { role: 'superadmin', name: '超级管理员' },
  { role: 'operation', name: '运营' },
  { role: 'finance', name: '财务' },
  { role: 'operator', name: '操作员' },
  { role: 'picker', name: '配货员' }
];

// 默认权限配置
const DEFAULT_PERMISSIONS = {
  superadmin: { dashboard: true, statistics: true, admin_users: true, customer_manage: true, customer_audit: true, products: true, categories: true, pricing: true, orders: true, order_export: true, distribution: true, promoter_manage: true, banners: true, permissions: true },
  operation: { dashboard: true, statistics: true, admin_users: true, customer_manage: true, products: true, categories: true, orders: true, banners: true },
  finance: { dashboard: true, statistics: true, pricing: true, orders: true, distribution: true, promoter_manage: true },
  operator: { pricing: true, customer_manage: true, customer_audit: true, orders: true },
  picker: { orders: true }
};

export default function PermissionManage() {
  const [roles] = useState(FIXED_ROLES);
  const [selectedRole, setSelectedRole] = useState('superadmin');
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS['superadmin']);
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (roleCode) => {
    setSelectedRole(roleCode);
    setPermissions(DEFAULT_PERMISSIONS[roleCode] || {});
  };

  const togglePermission = (key) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const savePermissions = async () => {
    try {
      // 转换权限格式为后端期望的格式
      const permissionArray = Object.entries(permissions)
        .filter(([_, value]) => value)
        .map(([key, _]) => {
          // 映射前端权限键名到后端权限键名
          const keyMap = {
            dashboard: 'dashboard',
            statistics: 'dashboard',
            admin_users: 'admin_user_manage',
            customer_manage: 'customer_manage',
            customer_audit: 'customer_audit',
            products: 'product_manage',
            categories: 'category_manage',
            pricing: 'price_manage',
            orders: 'order_manage',
            order_export: 'order_manage',
            distribution: 'distribution_manage',
            promoter_manage: 'distribution_manage',
            banners: 'banner_manage',
            permissions: 'permission_config'
          };
          return keyMap[key] || key;
        });

      // 由于后端权限管理是针对单个管理员的，这里我们先获取所有管理员
      const adminsRes = await adminAPI.get('/admin/users');
      if (adminsRes.code === 200) {
        const admins = adminsRes.data.list; // 后端返回的是包含list的对象
        // 找到该角色的所有管理员并更新其权限
        const roleAdmins = admins.filter(admin => admin.role === selectedRole);
        
        for (const admin of roleAdmins) {
          const res = await adminAPI.put(`/admin/permissions/admin/${admin.id}`, {
            permissions: permissionArray
          });
          if (res.code !== 200) {
            throw new Error('保存权限失败');
          }
        }
        
        alert('权限保存成功');
      }
    } catch (error) {
      console.error('保存权限失败:', error);
      alert('保存失败');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">权限配置管理</h1>

      {/* 角色选择 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">选择角色</h2>
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <button
              key={role.role}
              onClick={() => handleRoleChange(role.role)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                selectedRole === role.role
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {ROLE_NAMES[role.role] || role.role}
            </button>
          ))}
        </div>
      </div>

      {/* 权限配置 */}
      {selectedRole && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              {ROLE_NAMES[selectedRole]} - 权限配置
            </h2>
            <button
              onClick={savePermissions}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              保存权限
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.name} className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3 border-b pb-2">{group.name}</h3>
                <div className="space-y-2">
                  {group.permissions.map((perm) => (
                    <label key={perm.key} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!permissions[perm.key]}
                        onChange={() => togglePermission(perm.key)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">权限说明</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li><strong>最高管理员</strong>：拥有所有权限，不可修改</li>
              <li><strong>财务</strong>：负责数据统计、利润加权、成本价修改、订单管理、分销管理</li>
              <li><strong>运营</strong>：负责数据统计、操作员管理、客户管理、商品/分类/订单管理</li>
              <li><strong>操作员</strong>：仅负责成本价修改、客户审核、订单管理</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}