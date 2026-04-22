-- WB食堂食材下单系统 - 数据库结构
-- SQLite Database Schema

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nickname TEXT,
    role TEXT DEFAULT 'customer',
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 管理员表
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 商品分类表
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_th TEXT,
    sort_order INTEGER DEFAULT 0,
    status INTEGER DEFAULT 1
);

-- 商品表
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT NOT NULL,
    name_th TEXT,
    specs TEXT,
    unit TEXT,
    price DECIMAL(10,2),
    stock INTEGER DEFAULT 0,
    status INTEGER DEFAULT 1,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 轮播图表
CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT,
    sort_order INTEGER DEFAULT 0,
    status INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    total_amount DECIMAL(10,2),
    status TEXT DEFAULT 'pending',
    remark TEXT,
    picker_id INTEGER,
    picked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (picker_id) REFERENCES users(id)
);

-- 订单商品表
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    product_name TEXT,
    specs TEXT,
    unit TEXT,
    price DECIMAL(10,2),
    quantity INTEGER,
    actual_qty INTEGER,
    actual_weight DECIMAL(10,2),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 初始化数据

-- 管理员
INSERT OR IGNORE INTO admins (id, username, password, role) VALUES 
(1, 'admin', '21232f297a57a5a743894a0e4a801fc3', 'superadmin'),
(2, 'finance', '21232f297a57a5a743894a0e4a801fc3', 'finance'),
(3, 'channel', '21232f297a57a5a743894a0e4a801fc3', 'channel');

-- 配货员(作为用户)
INSERT OR IGNORE INTO users (id, username, password, nickname, role) VALUES 
(100, 'picker', 'e10adc3949ba59abbe56e057f20f883e', '配货员', 'picker');

-- 测试用户
INSERT OR IGNORE INTO users (id, username, password, nickname, role) VALUES 
(1, 'user001', '202cb962ac59075b964b07152d234b70', '张三', 'distributor'),
(2, 'user002', '202cb962ac59075b964b07152d234b70', '李四', 'employee'),
(3, 'user003', '202cb962ac59075b964b07152d234b70', '王五', 'customer');

-- 商品分类
INSERT OR IGNORE INTO categories (id, name, name_th, sort_order) VALUES 
(1, '蔬菜', 'ผัก', 1),
(2, '水果', 'ผลไม้', 2),
(3, '肉类', 'เนื้อสัตว์', 3),
(4, '海鲜', 'อาหารทะเล', 4),
(5, '蛋奶', 'ไข่และนม', 5);

-- 商品示例
INSERT OR IGNORE INTO products (id, category_id, name, name_th, specs, unit, price, stock, status) VALUES 
(1, 5, '3号鸡蛋', 'ไข่เบอร์ 3', '30枚/盒', '盒', 45.00, 100, 1),
(2, 1, '白菜', 'ผักกาดขาว', '约1kg', '颗', 8.50, 200, 1),
(3, 3, '五花肉', 'หมูสามชั้น', '500g', '份', 35.00, 50, 1);

