-- WB Canteen System - Supabase Database Setup
-- Run this script in Supabase SQL Editor

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nickname TEXT,
    role TEXT DEFAULT 'customer',
    phone TEXT,
    address TEXT,
    parent_id INTEGER,
    promoter_code TEXT,
    order_title TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    name_th TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    price NUMERIC(10,2) NOT NULL,
    cost_price NUMERIC(10,2),
    profit_weight NUMERIC(10,2) DEFAULT 0,
    unit TEXT,
    specs TEXT,
    stock INTEGER DEFAULT 0,
    image TEXT,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_no TEXT UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    total NUMERIC(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    remark TEXT,
    actual_cost NUMERIC(10,2),
    actual_amount NUMERIC(10,2),
    profit_amount NUMERIC(10,2),
    address TEXT,
    contact TEXT,
    phone TEXT,
    picked_by INTEGER,
    picked_at TIMESTAMP,
    picker_remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT,
    name_th TEXT,
    specs TEXT,
    price NUMERIC(10,2),
    quantity INTEGER,
    subtotal NUMERIC(10,2),
    actual_qty INTEGER,
    actual_weight TEXT,
    unit TEXT
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nickname TEXT,
    role TEXT DEFAULT 'operator',
    status INTEGER DEFAULT 1,
    last_login TIMESTAMP,
    permissions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Banners table
CREATE TABLE IF NOT EXISTS banners (
    id SERIAL PRIMARY KEY,
    title TEXT,
    image TEXT NOT NULL,
    link TEXT,
    position TEXT DEFAULT 'home',
    sort_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User addresses table
CREATE TABLE IF NOT EXISTS user_addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System config table
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promoter bindings table
CREATE TABLE IF NOT EXISTS promoter_bindings (
    id SERIAL PRIMARY KEY,
    promoter_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    bind_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    UNIQUE(promoter_id, customer_id)
);

-- Promoter applications table
CREATE TABLE IF NOT EXISTS promoter_applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promoter earnings table
CREATE TABLE IF NOT EXISTS promoter_earnings (
    id SERIAL PRIMARY KEY,
    promoter_id INTEGER NOT NULL,
    order_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    order_amount NUMERIC(10,2),
    profit_amount NUMERIC(10,2),
    commission_type TEXT,
    commission_rate NUMERIC(5,2),
    commission_amount NUMERIC(10,2),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Picking history table
CREATE TABLE IF NOT EXISTS picking_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    picker_id INTEGER NOT NULL,
    picking_data TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    picked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    confirmed_by INTEGER
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_promoter_bindings_promoter ON promoter_bindings(promoter_id);
CREATE INDEX IF NOT EXISTS idx_promoter_bindings_customer ON promoter_bindings(customer_id);
CREATE INDEX IF NOT EXISTS idx_promoter_earnings_promoter ON promoter_earnings(promoter_id);

-- Insert default system config
INSERT INTO system_config (config_key, config_value, description)
VALUES ('commission_type', 'profit', '提成类型：profit-利润提成，sales-销售额提成')
ON CONFLICT (config_key) DO NOTHING;

INSERT INTO system_config (config_key, config_value, description)
VALUES ('commission_rate', '10', '提成比例（百分比）')
ON CONFLICT (config_key) DO NOTHING;

-- Insert default admin user (password: admin123)
INSERT INTO admins (username, password, nickname, role)
VALUES ('admin', '$2a$10$XQzQ3K3L5v7VHfM8dYZLKeGdJxLqQQLHvLGJZdN5QxWvPQvZ5kOaG', '超级管理员', 'superadmin')
ON CONFLICT (username) DO NOTHING;

-- Insert default categories
INSERT INTO categories (name, icon, sort_order) VALUES
    ('禽蛋类', '🥚', 1),
    ('蔬菜类', '🥬', 2),
    ('进口蔬菜', '🥦', 3),
    ('水果类', '🍎', 4),
    ('肉类', '🥩', 5),
    ('水产类', '🐟', 6),
    ('调料干货', '🧂', 7),
    ('酒水类', '🍺', 8)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS) - optional, comment out if not needed
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - optional
-- CREATE POLICY "Allow all for authenticated users" ON users FOR ALL TO authenticated USING (true);
-- CREATE POLICY "Allow all for authenticated users" ON products FOR ALL TO authenticated USING (true);
-- CREATE POLICY "Allow all for authenticated users" ON orders FOR ALL TO authenticated USING (true);

SELECT 'Database setup completed successfully!' AS result;
