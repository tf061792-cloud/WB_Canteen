const path = require('path');
const fs = require('fs');

console.log('🚀 开始清除订单和分销收益数据...');

// 引入数据库模块
const { initDatabase, getDb, saveDb } = require('../src/db/sqlite.js');

async function clearOrders() {
  try {
    // 先初始化数据库
    console.log('📦 正在初始化数据库...');
    await initDatabase();
    console.log('✅ 数据库初始化完成');
    console.log('');

    const db = getDb();
    
    // 统计现有数据
    const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const orderItemCount = db.prepare('SELECT COUNT(*) as count FROM order_items').get().count;
    const earningsCount = db.prepare('SELECT COUNT(*) as count FROM promoter_earnings').get().count;
    const pickingHistoryCount = db.prepare('SELECT COUNT(*) as count FROM picking_history').get().count;
    
    console.log('📊 现有数据统计:');
    console.log(`  - 订单数: ${orderCount}`);
    console.log(`  - 订单商品数: ${orderItemCount}`);
    console.log(`  - 分销收益数: ${earningsCount}`);
    console.log(`  - 配货历史数: ${pickingHistoryCount}`);
    console.log('');

    console.log('🗑️  开始清除数据...');

    // 开始事务
    db.prepare('BEGIN TRANSACTION').run();

    try {
      // 清除订单商品
      const deleteOrderItems = db.prepare('DELETE FROM order_items').run();
      console.log(`✅ 已清除 ${deleteOrderItems.changes} 条订单商品数据`);

      // 清除分销收益
      const deleteEarnings = db.prepare('DELETE FROM promoter_earnings').run();
      console.log(`✅ 已清除 ${deleteEarnings.changes} 条分销收益数据`);

      // 清除配货历史
      const deletePickingHistory = db.prepare('DELETE FROM picking_history').run();
      console.log(`✅ 已清除 ${deletePickingHistory.changes} 条配货历史数据`);

      // 清除订单
      const deleteOrders = db.prepare('DELETE FROM orders').run();
      console.log(`✅ 已清除 ${deleteOrders.changes} 条订单数据`);

      // 提交事务
      db.prepare('COMMIT').run();

      // 保存数据库
      await saveDb();

      console.log('');
      console.log('🎉 所有订单和分销收益数据已清除完毕！');
      
    } catch (error) {
      db.prepare('ROLLBACK').run();
      console.error('❌ 清除数据时出错，已回滚:', error);
      throw error;
    }

  } catch (error) {
    console.error('❌ 清除数据失败:', error);
    process.exit(1);
  }
}

// 执行清除
clearOrders()
  .then(() => {
    console.log('');
    console.log('✅ 脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });
