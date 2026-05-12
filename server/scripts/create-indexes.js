// 创建数据库索引优化查询性能
const { initDatabase, getDb } = require('../src/db/sqlite');

async function createIndexes() {
  console.log('🔧 开始创建数据库索引...\n');
  
  try {
    await initDatabase();
    const db = getDb();
    
    const indexes = [
      // 商品表索引
      { name: 'idx_products_category', sql: 'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)' },
      { name: 'idx_products_status', sql: 'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)' },
      { name: 'idx_products_name', sql: 'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)' },
      { name: 'idx_products_name_th', sql: 'CREATE INDEX IF NOT EXISTS idx_products_name_th ON products(name_th)' },
      
      // 订单表索引
      { name: 'idx_orders_user', sql: 'CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)' },
      { name: 'idx_orders_status', sql: 'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)' },
      { name: 'idx_orders_created', sql: 'CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)' },
      { name: 'idx_orders_no', sql: 'CREATE INDEX IF NOT EXISTS idx_orders_no ON orders(order_no)' },
      
      // 订单商品表索引
      { name: 'idx_order_items_order', sql: 'CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)' },
      { name: 'idx_order_items_product', sql: 'CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id)' },
      
      // 用户表索引
      { name: 'idx_users_username', sql: 'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)' },
      { name: 'idx_users_role', sql: 'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)' },
      
      // 管理员表索引
      { name: 'idx_admins_username', sql: 'CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username)' },
      { name: 'idx_admins_role', sql: 'CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role)' },
      
      // 推广员相关索引
      { name: 'idx_promoter_relations_promoter', sql: 'CREATE INDEX IF NOT EXISTS idx_promoter_relations_promoter ON promoter_relations(promoter_id)' },
      { name: 'idx_promoter_relations_customer', sql: 'CREATE INDEX IF NOT EXISTS idx_promoter_relations_customer ON promoter_relations(customer_id)' },
      
      // 分销收益索引
      { name: 'idx_distribution_order', sql: 'CREATE INDEX IF NOT EXISTS idx_distribution_order ON distribution(order_id)' },
      { name: 'idx_distribution_promoter', sql: 'CREATE INDEX IF NOT EXISTS idx_distribution_promoter ON distribution(promoter_id)' }
    ];
    
    let createdCount = 0;
    let existsCount = 0;
    
    for (const { name, sql } of indexes) {
      try {
        db.run(sql);
        console.log(`✅ 创建索引: ${name}`);
        createdCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  索引已存在: ${name}`);
          existsCount++;
        } else {
          console.log(`❌ 创建索引失败: ${name} - ${error.message}`);
        }
      }
    }
    
    console.log('\n📊 索引创建完成!');
    console.log(`新建: ${createdCount} 个`);
    console.log(`已存在: ${existsCount} 个`);
    
  } catch (error) {
    console.error('❌ 创建索引失败:', error);
    process.exit(1);
  }
}

createIndexes();
