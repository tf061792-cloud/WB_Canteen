// 数据库模块 - CommonJS
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// 使用 Railway 的持久化存储目录，或本地开发目录
const isRailway = process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_ENVIRONMENT;
const dbDir = isRailway ? '/data' : path.join(__dirname, '../../data');
const dbPath = path.join(dbDir, 'canteen.db');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;

class Database {
  constructor(database) {
    this.db = database;
  }

  prepare(sql) {
    const that = this;
    return {
      run: (...params) => {
        const stmt = that.db.prepare(sql);
        stmt.bind(params);
        stmt.step();
        const changes = that.db.getRowsModified();
        const lastInsertRowid = that.db.exec("SELECT last_insert_rowid()")[0]?.values[0][0] || 0;
        stmt.free();
        return { changes, lastInsertRowid };
      },
      get: (...params) => {
        const stmt = that.db.prepare(sql);
        stmt.bind(params);
        const result = stmt.step() ? stmt.getAsObject() : null;
        stmt.free();
        return result;
      },
      all: (...params) => {
        const stmt = that.db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  }

  exec(sql) {
    this.db.run(sql);
  }

  save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

async function initDatabase() {
  const SQL = await initSqlJs();
  const isNewDatabase = !fs.existsSync(dbPath);

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new Database(new SQL.Database(fileBuffer));
    console.log('✅ SQLite 数据库加载成功');
  } else {
    db = new Database(new SQL.Database());
    console.log('✅ SQLite 数据库创建成功');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT,
      role TEXT DEFAULT 'user',
      parent_id INTEGER,
      promoter_code TEXT,
      order_title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_th TEXT,
      category_id INTEGER,
      price DECIMAL(10,2) NOT NULL,
      cost_price DECIMAL(10,2),
      profit_weight DECIMAL(10,2) DEFAULT 0,
      unit TEXT,
      specs TEXT,
      stock INTEGER DEFAULT 0,
      image TEXT,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      status TEXT DEFAULT 'pending',
      remark TEXT,
      actual_cost DECIMAL(10,2),
      actual_amount DECIMAL(10,2),
      profit_amount DECIMAL(10,2),
      address TEXT,
      contact TEXT,
      phone TEXT,
      picked_by INTEGER,
      picked_at DATETIME,
      picker_remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT,
      name_th TEXT,
      specs TEXT,
      price DECIMAL(10,2),
      quantity INTEGER,
      subtotal DECIMAL(10,2),
      actual_qty INTEGER,
      actual_weight TEXT,
      unit TEXT
    )
  `);

  try {
    const columns = db.prepare("PRAGMA table_info(orders)").all();
    const columnNames = columns.map(col => col.name);

    if (!columnNames.includes('picked_by')) {
      db.exec('ALTER TABLE orders ADD COLUMN picked_by INTEGER');
      console.log('✅ 已添加列: picked_by');
    }
    if (!columnNames.includes('picked_at')) {
      db.exec('ALTER TABLE orders ADD COLUMN picked_at DATETIME');
      console.log('✅ 已添加列: picked_at');
    }
    if (!columnNames.includes('picker_remark')) {
      db.exec('ALTER TABLE orders ADD COLUMN picker_remark TEXT');
      console.log('✅ 已添加列: picker_remark');
    }
    if (!columnNames.includes('actual_cost')) {
      db.exec('ALTER TABLE orders ADD COLUMN actual_cost DECIMAL(10,2)');
      console.log('✅ 已添加列: actual_cost');
    }
    if (!columnNames.includes('actual_amount')) {
      db.exec('ALTER TABLE orders ADD COLUMN actual_amount DECIMAL(10,2)');
      console.log('✅ 已添加列: actual_amount');
    }
    if (!columnNames.includes('profit_amount')) {
      db.exec('ALTER TABLE orders ADD COLUMN profit_amount DECIMAL(10,2)');
      console.log('✅ 已添加列: profit_amount');
    }
    if (!columnNames.includes('customs_fee')) {
      db.exec('ALTER TABLE orders ADD COLUMN customs_fee DECIMAL(10,2)');
      console.log('✅ 已添加列: customs_fee');
    }

    const userColumns = db.prepare("PRAGMA table_info(users)").all();
    const userColumnNames = userColumns.map(col => col.name);
    if (!userColumnNames.includes('promoter_code')) {
      db.exec('ALTER TABLE users ADD COLUMN promoter_code TEXT');
      console.log('✅ 已添加列: promoter_code');
    }
    if (!userColumnNames.includes('order_title')) {
      db.exec('ALTER TABLE users ADD COLUMN order_title TEXT');
      console.log('✅ 已添加列: order_title');
    }

    const orderItemColumns = db.prepare("PRAGMA table_info(order_items)").all();
    const orderItemColumnNames = orderItemColumns.map(col => col.name);
    if (!orderItemColumnNames.includes('name_th')) {
      db.exec('ALTER TABLE order_items ADD COLUMN name_th TEXT');
      console.log('✅ 已添加列: name_th');
    }
    if (!orderItemColumnNames.includes('picked_product_name')) {
      db.exec('ALTER TABLE order_items ADD COLUMN picked_product_name TEXT');
      console.log('✅ 已添加列: picked_product_name');
    }
    if (!orderItemColumnNames.includes('picked_name_th')) {
      db.exec('ALTER TABLE order_items ADD COLUMN picked_name_th TEXT');
      console.log('✅ 已添加列: picked_name_th');
    }

    const updateResult = db.prepare("UPDATE orders SET status = 'confirmed' WHERE status = 'pending'").run();
    if (updateResult.changes > 0) {
      console.log(`✅ 已更新 ${updateResult.changes} 个旧订单状态: pending -> confirmed`);
    }
  } catch (e) {
    console.log('迁移检查:', e.message);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT,
      role TEXT DEFAULT 'operator',
      status INTEGER DEFAULT 1,
      last_login DATETIME,
      permissions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      image TEXT NOT NULL,
      link TEXT,
      position TEXT DEFAULT 'home',
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS promoter_bindings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      promoter_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      bind_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active',
      UNIQUE(promoter_id, customer_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS promoter_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS promoter_earnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      promoter_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      order_amount DECIMAL(10,2),
      profit_amount DECIMAL(10,2),
      commission_type TEXT,
      commission_rate DECIMAL(5,2),
      commission_amount DECIMAL(10,2),
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key TEXT UNIQUE NOT NULL,
      config_value TEXT,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 插入默认系统配置
  db.exec(`
    INSERT OR IGNORE INTO system_config (config_key, config_value, description) VALUES ('commission_type', 'profit', '提成类型：profit-利润提成，sales-销售额提成');
    INSERT OR IGNORE INTO system_config (config_key, config_value, description) VALUES ('commission_rate', '10', '提成比例（百分比）');
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS picking_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      picker_id INTEGER NOT NULL,
      picking_data TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      picked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      confirmed_at DATETIME,
      confirmed_by INTEGER
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_parent ON users(parent_id);
    CREATE INDEX IF NOT EXISTS idx_banners_status ON banners(status);
    CREATE INDEX IF NOT EXISTS idx_addresses_user ON user_addresses(user_id);
    CREATE INDEX IF NOT EXISTS idx_promoter_bindings_promoter ON promoter_bindings(promoter_id);
    CREATE INDEX IF NOT EXISTS idx_promoter_bindings_customer ON promoter_bindings(customer_id);
    CREATE INDEX IF NOT EXISTS idx_promoter_earnings_promoter ON promoter_earnings(promoter_id);
    CREATE INDEX IF NOT EXISTS idx_promoter_earnings_order ON promoter_earnings(order_id);
    CREATE INDEX IF NOT EXISTS idx_picking_history_order ON picking_history(order_id);
  `);
  console.log('✅ 数据库索引创建完成');

  // 只有在数据库文件不存在时才插入预设分类
  if (isNewDatabase) {
    const categories = [
      { name: '禽蛋类', icon: '🥚', sort: 1 },
      { name: '蔬菜类', icon: '🥬', sort: 2 },
      { name: '进口蔬菜', icon: '🥦', sort: 3 },
      { name: '水果类', icon: '🍎', sort: 4 },
      { name: '肉类', icon: '🥩', sort: 5 },
      { name: '水产类', icon: '🐟', sort: 6 },
      { name: '调料干货', icon: '🧂', sort: 7 },
      { name: '酒水类', icon: '🍺', sort: 8 }
    ];

    categories.forEach(cat => {
      db.prepare('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)')
        .run(cat.name, cat.icon, cat.sort);
    });
    console.log('✅ 默认分类插入完成');
  }

  const adminExists = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admins (username, password, nickname, role) VALUES (?, ?, ?, ?)')
      .run('admin', hashedPassword, '超级管理员', 'superadmin');
    console.log('✅ 超级管理员账号已创建');
  } else {
    console.log('✅ 超级管理员账号已存在');
  }

  const pickerExists = db.prepare('SELECT id FROM admins WHERE username = ?').get('picker');
  if (!pickerExists) {
    const hashedPassword = bcrypt.hashSync('picker123', 10);
    db.prepare('INSERT INTO admins (username, password, nickname, role) VALUES (?, ?, ?, ?)')
      .run('picker', hashedPassword, '配货员', 'picker');
    console.log('✅ 配货员账号已创建');
  } else {
    console.log('✅ 配货员账号已存在');
  }

  db.save();
  console.log('✅ 数据库初始化数据保存完成');

  return db;
}

function getDb() {
  if (!db) {
    throw new Error('数据库未初始化');
  }
  return db;
}

function saveDb() {
  if (db) {
    db.save();
  }
}

module.exports = {
  initDatabase,
  getDb,
  saveDb,
  db
};