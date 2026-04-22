const { getDb, initDatabase } = require('./src/db/sqlite');

async function checkData() {
  try {
    console.log('=== 数据检查 ===');

    // 初始化数据库
    await initDatabase();
    console.log('数据库初始化完成');

    const db = getDb();

    // 检查用户表
    const users = db.prepare('SELECT id, username, role FROM users').all();
    console.log('\n用户表记录:');
    if (users.length > 0) {
      users.forEach(row => {
        console.log(`  ID: ${row.id}, Username: ${row.username}, Role: ${row.role}`);
      });
    } else {
      console.log('  (空)');
    }

    // 检查订单表
    const orders = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    console.log(`\n订单表记录数: ${orders.count}`);

    // 检查订单商品表
    const orderItems = db.prepare('SELECT COUNT(*) as count FROM order_items').get();
    console.log(`订单商品表记录数: ${orderItems.count}`);

    // 检查收益记录表
    const earnings = db.prepare('SELECT COUNT(*) as count FROM promoter_earnings').get();
    console.log(`\n收益记录表记录数: ${earnings.count}`);

    // 检查推广员绑定表
    const bindings = db.prepare('SELECT COUNT(*) as count FROM promoter_bindings').get();
    console.log(`推广员绑定表记录数: ${bindings.count}`);

    // 检查推广申请表
    const applications = db.prepare('SELECT COUNT(*) as count FROM promoter_applications').get();
    console.log(`推广申请表记录数: ${applications.count}`);

    console.log('\n=== 检查完成 ===');
  } catch (error) {
    console.error('检查失败:', error);
    console.error(error.stack);
  }
}

checkData();