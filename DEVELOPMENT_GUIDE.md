# WB食堂食材下单系统 - 完整开发资料

## 1. 项目概述

### 1.1 系统架构
- **类型**: 单一商户 B2C 电商系统（COD货到付款）
- **架构模式**: 前后端分离 + 统一入口代理
- **部署方式**: 多端口服务 + 反向代理

### 1.2 技术栈

#### 前端
| 模块 | 技术 | 端口 |
|------|------|------|
| 用户端 (Client) | React 18 + Vite + Zustand + TailwindCSS | 3001 |
| 管理端 (Admin) | React 18 + Vite + Zustand + TailwindCSS + i18n | 3005 |
| 配货端 (Picker) | React 18 + Vite + Zustand + TailwindCSS + i18n | 3007 |

#### 后端
| 服务 | 技术 | 端口 |
|------|------|------|
| API服务 | Node.js + Express + SQLite (sql.js) | 3006 |
| 入口代理 | Node.js + http-proxy | 5000 |

#### 数据库
- **类型**: SQLite (WebAssembly版本)
- **文件位置**: `/server/data/canteen.db`

## 2. 项目结构

```
/workspace/projects/
├── admin/                 # 管理端 (PC)
│   ├── src/
│   │   ├── api/          # API调用
│   │   ├── components/   # 公共组件
│   │   ├── locales/      # 国际化文件
│   │   ├── stores/       # Zustand状态管理
│   │   ├── utils/        # 工具函数
│   │   ├── views/        # 页面组件
│   │   ├── App.jsx       # 根组件
│   │   └── main.jsx      # 入口文件
│   ├── dist/             # 构建输出
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── client/                # 用户端 (H5)
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── stores/
│   │   ├── views/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── dist/
│   └── package.json
├── picker/                # 配货端 (H5)
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── locales/
│   │   ├── stores/
│   │   ├── views/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── dist/
│   └── package.json
├── server/                # 后端服务
│   ├── src/
│   │   ├── db/           # 数据库模块
│   │   ├── middleware/   # 中间件
│   │   ├── routes/       # 路由文件
│   │   ├── utils/        # 工具函数
│   │   └── index.js      # 入口文件
│   ├── data/
│   │   └── canteen.db    # SQLite数据库
│   ├── public/           # 静态资源
│   └── entry.js          # 入口代理服务
├── index.html            # 入口页面
└── AGENTS.md             # 项目规范
```

## 3. 服务端口配置

| 服务 | 端口 | 说明 | 开发命令 |
|------|------|------|----------|
| 入口端 | 5000 | 统一入口代理 | `node entry.js` |
| 用户端 | 3001 | 前端H5 | `pnpm dev` |
| 管理端 | 3005 | 管理后台PC | `pnpm dev` |
| 配货端 | 3007 | 配货员H5 | `pnpm dev` |
| 后端API | 3006 | Express API | `node src/index.js` |

## 4. 数据库结构

### 4.1 用户表 (users)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| username | TEXT | 用户名(登录用) |
| password | TEXT | 密码(MD5) |
| nickname | TEXT | 昵称 |
| role | TEXT | 角色: distributor/employee/customer |
| phone | TEXT | 手机号 |
| address | TEXT | 地址 |
| created_at | TIMESTAMP | 创建时间 |

### 4.2 管理员表 (admins)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| username | TEXT | 用户名 |
| password | TEXT | 密码 |
| role | TEXT | 角色: superadmin/finance/channel |
| created_at | TIMESTAMP | 创建时间 |

### 4.3 商品分类表 (categories)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 分类名称 |
| name_th | TEXT | 泰文名称 |
| sort_order | INTEGER | 排序 |
| status | INTEGER | 状态: 0/1 |

### 4.4 商品表 (products)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| category_id | INTEGER | 分类ID |
| name | TEXT | 商品名称 |
| name_th | TEXT | 泰文名称 |
| specs | TEXT | 规格 |
| unit | TEXT | 单位 |
| price | DECIMAL | 价格 |
| stock | INTEGER | 库存 |
| status | INTEGER | 状态: 0/1 |
| image_url | TEXT | 图片URL |
| created_at | TIMESTAMP | 创建时间 |

### 4.5 订单表 (orders)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| order_no | TEXT | 订单号 |
| user_id | INTEGER | 用户ID |
| total_amount | DECIMAL | 总金额 |
| status | TEXT | 状态 |
| remark | TEXT | 备注 |
| picker_id | INTEGER | 配货员ID |
| picked_at | TIMESTAMP | 配货时间 |
| created_at | TIMESTAMP | 创建时间 |

**订单状态说明**:
- `pending`: 待支付
- `confirmed`: 已确认/待配货
- `picked`: 已配货待确认
- `shipped`: 已发货
- `completed`: 已完成
- `cancelled`: 已取消

### 4.6 订单商品表 (order_items)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| order_id | INTEGER | 订单ID |
| product_id | INTEGER | 商品ID |
| product_name | TEXT | 商品名称(快照) |
| specs | TEXT | 规格 |
| unit | TEXT | 单位 |
| price | DECIMAL | 单价 |
| quantity | INTEGER | 下单数量 |
| actual_qty | INTEGER | 实际配货数量 |
| actual_weight | DECIMAL | 实际重量 |

## 5. API接口文档

### 5.1 用户认证
| 接口 | 方法 | 说明 |
|------|------|------|
| /api/auth/login | POST | 用户登录 |
| /api/auth/register | POST | 用户注册 |
| /api/auth/info | GET | 获取用户信息 |

### 5.2 商品接口
| 接口 | 方法 | 说明 |
|------|------|------|
| /api/products | GET | 商品列表(分页) |
| /api/products/categories | GET | 分类列表 |
| /api/products/:id | GET | 商品详情 |

### 5.3 订单接口
| 接口 | 方法 | 说明 |
|------|------|------|
| /api/orders | POST | 创建订单 |
| /api/orders | GET | 订单列表 |
| /api/orders/:id | GET | 订单详情 |
| /api/orders/:id | PUT | 更新订单 |

### 5.4 配货员接口
| 接口 | 方法 | 说明 |
|------|------|------|
| /api/picker/auth/login | POST | 配货员登录 |
| /api/picker/orders | GET | 待配货订单 |
| /api/picker/orders/:id | GET | 订单详情 |
| /api/picker/orders/:id/pick | POST | 提交配货 |

### 5.5 管理端接口
| 接口 | 方法 | 说明 |
|------|------|------|
| /api/admin/auth/login | POST | 管理员登录 |
| /api/orders/admin/list | GET | 订单列表(分页) |
| /api/orders/admin/stats | GET | 订单统计 |
| /api/orders/:id | PUT | 更新订单状态 |

## 6. 启动命令

```bash
# 1. 启动后端API (端口3006)
cd /workspace/projects/server
node src/index.js

# 2. 启动入口代理 (端口5000)
cd /workspace/projects/server
node entry.js

# 3. 启动用户端 (端口3001)
cd /workspace/projects/client
pnpm dev

# 4. 启动管理端 (端口3005)
cd /workspace/projects/admin
pnpm dev

# 5. 启动配货端 (端口3007)
cd /workspace/projects/picker
pnpm dev
```

## 7. 测试账户

### 用户端
| 账号 | 密码 | 角色 |
|------|------|------|
| user001 | test123 | 分销员(张三) |
| user002 | test123 | 员工(李四) |
| user003 | test123 | 普通用户(王五) |

### 管理端
| 账号 | 密码 | 角色 |
|------|------|------|
| admin | admin123 | 超级管理员 |
| finance | admin123 | 财务 |
| channel | admin123 | 渠道 |

### 配货端
| 账号 | 密码 |
|------|------|
| picker | picker123 |

## 8. 访问地址

- 主入口: https://1ee0082a-ac8f-4b18-9865-94531173a95e.dev.coze.site
- 用户端: https://1ee0082a-ac8f-4b18-9865-94531173a95e.dev.coze.site/client/
- 管理端: https://1ee0082a-ac8f-4b18-9865-94531173a95e.dev.coze.site/admin/
- 配货端: https://1ee0082a-ac8f-4b18-9865-94531173a95e.dev.coze.site/picker/

## 9. 技术要点

### 9.1 状态管理
使用 Zustand + localStorage 持久化:
- 用户端: `{ user, cart }`
- 管理端: `{ token, admin }`
- 配货端: `{ token, picker }`

### 9.2 国际化
- 管理端: 支持中文/英文/泰文
- 配货端: 支持中文/英文/泰文
- 使用 i18next + react-i18next

### 9.3 代理配置
入口端(entry.js)统一代理:
- `/client/*` -> localhost:3001
- `/admin/*` -> localhost:3005 (开发模式代理)
- `/picker/*` -> localhost:3007
- `/api/*` -> localhost:3006

### 9.4 订单流转
1. 用户下单 -> 状态: `pending`
2. 支付/确认 -> 状态: `confirmed` (待配货)
3. 配货员配货 -> 状态: `picked` (已配货待确认)
4. 管理员确认 -> 状态: `shipped` (已发货)
5. 完成 -> 状态: `completed`

---
生成时间: $(date)
版本: v1.0
