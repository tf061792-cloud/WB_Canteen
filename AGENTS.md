# WB 食堂食材下单系统 - 开发规范

## 项目概览

- **项目类型**: 单一商户 B2C 电商（COD货到付款）
- **技术栈**: React + Vite + Zustand + TailwindCSS
- **数据库**: SQLite (sql.js WebAssembly)
- **认证**: JWT (用户名密码)

## 目录结构

```
/workspace/projects/
├── server/          # 后端 API 服务 (端口 3006)
│   ├── src/
│   │   ├── index.js           # 入口文件
│   │   ├── db/sqlite.js       # 数据库模块
│   │   ├── middleware/auth.js # 认证中间件
│   │   └── routes/            # 路由文件
│   └── data/canteen.db        # SQLite 数据库文件
├── client/          # 用户端 H5 (端口 3001)
│   ├── src/
│   │   ├── api/index.js       # API 调用
│   │   ├── stores/            # Zustand 状态
│   │   └── views/             # 页面组件
│   └── vite.config.js         # 代理配置
├── admin/           # 管理端 PC (端口 3005)
│   ├── src/
│   │   ├── api/index.js       # API 调用
│   │   ├── stores/            # Zustand 状态
│   │   └── views/             # 页面组件
│   └── vite.config.js         # 代理配置
└── .coze            # 项目配置
```

## 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| 用户端 H5 | 3001 | 前端，代理到后端 |
| 管理端 PC | 3005 | 前端，代理到后端 |
| 后端 API | 3006 | Express API 服务 |
| SQLite | 文件存储 | /server/data/canteen.db |

## 启动命令

```bash
# 后端
cd /workspace/projects/server && node src/index.js

# 用户端
cd /workspace/projects/client && pnpm dev

# 管理端
cd /workspace/projects/admin && pnpm dev
```

## API 接口

### 用户端 API (/api)

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/auth/login | POST | 用户登录 |
| /api/auth/register | POST | 用户注册 |
| /api/auth/info | GET | 获取用户信息 |
| /api/products | GET | 获取商品列表 |
| /api/products/categories | GET | 获取分类 |
| /api/products/:id | GET | 获取商品详情 |
| /api/orders | POST | 创建订单 |
| /api/orders | GET | 获取订单列表 |
| /api/orders/:id | GET | 获取订单详情 |
| /api/banners | GET | 获取轮播图 |

### 管理端 API (/api/admin)

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/admin/auth/login | POST | 管理员登录 |
| /api/orders/admin/list | GET | 订单列表 |
| /api/orders/admin/stats | GET | 订单统计 |
| /api/orders/:id | PUT | 更新订单 |

## 测试账户

| 端 | 账号 | 密码 | 角色 |
|-----|------|------|------|
| 用户端 | user001 | test123 | 分销员（张三） |
| 用户端 | user002 | test123 | 员工（李四） |
| 用户端 | user003 | test123 | 普通用户（王五） |
| 管理端 | admin | admin123 | 超级管理员 |
| 管理端 | finance | admin123 | 财务 |
| 管理端 | channel | admin123 | 渠道 |

## 数据库表

| 表名 | 说明 |
|------|------|
| users | 用户表（用户名登录） |
| admins | 管理员表 |
| categories | 商品分类 |
| products | 商品表 |
| orders | 订单表 |
| order_items | 订单商品表 |
| banners | 轮播图表 |

## 状态管理

- **用户端**: Zustand + localStorage，存储结构 `{ state: { user: {...}, cart: [...] } }`
- **管理端**: Zustand + localStorage，存储结构 `{ state: { token, admin: {...} } }`

## 订单状态

| 状态 | 说明 |
|------|------|
| pending | 待支付 |
| paid | 已支付 |
| shipped | 已发货 |
| completed | 已完成 |
| cancelled | 已取消 |

## 开发注意事项

1. **代理配置**: 前端通过 Vite 代理访问后端，避免跨域
2. **认证方式**: JWT Token，存储在 localStorage
3. **数据库**: SQLite 文件存储在 `/workspace/projects/server/data/`
4. **价格处理**: DECIMAL 返回字符串，前端需 `Number()` 转换
5. **pnpm**: 必须使用 pnpm，禁止 npm/yarn
