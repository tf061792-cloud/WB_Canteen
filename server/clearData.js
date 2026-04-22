async function clearData() {
  try {
    console.log('=== 开始清空数据 ===');

    const { getDb, initDatabase, saveDb } = require('./src/db/sqlite');

    // 初始化数据库
    await initDatabase();
    console.log('数据库初始化完成');

    const db = getDb();

    // 清空订单相关表
    db.exec('DELETE FROM order_items');
    console.log('已清空 order_items 表');

    db.exec('DELETE FROM orders');
    console.log('已清空 orders 表');

    // 清空分销相关表
    db.exec('DELETE FROM promoter_earnings');
    console.log('已清空 promoter_earnings 表');

    db.exec('DELETE FROM promoter_bindings');
    console.log('已清空 promoter_bindings 表');

    db.exec('DELETE FROM promoter_applications');
    console.log('已清空 promoter_applications 表');

    // 清空非管理员用户
    db.exec('DELETE FROM users WHERE role != "admin"');
    console.log('已清空非管理员用户记录');

    // 保存更改
    saveDb();
    console.log('数据库更改已保存');

    console.log('=== 数据清空完成 ===');

    // 验证
    console.log('\n=== 验证数据 ===');
    const orders = db.prepare('SELECT COUNT(*) as count FROM orders').get();
    console.log(`订单表记录数: ${orders.count}`);

    const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log(`用户表记录数: ${users.count}`);

    const earnings = db.prepare('SELECT COUNT(*) as count FROM promoter_earnings').get();
    console.log(`收益记录表记录数: ${earnings.count}`);

  } catch (error) {
    console.error('清空数据失败:', error);
    console.error(error.stack);
  }
}

clearData();