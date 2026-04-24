const express = require('express');
const { getDb } = require('../db/sqlite');

const router = express.Router();

// 清除测试数据（仅超级管理员）
router.post('/clear-test-data', async (req, res) => {
  try {
    // 检查是否是超级管理员
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: '只有超级管理员可以清除测试数据' 
      });
    }

    const db = getDb();

    console.log('🧹 开始清除测试数据...');
    console.log('👤 操作者:', req.admin.username);

    // 统计现有数据
    const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const orderItemCount = db.prepare('SELECT COUNT(*) as count FROM order_items').get().count;
    const earningsCount = db.prepare('SELECT COUNT(*) as count FROM promoter_earnings').get().count;
    const pickingHistoryCount = db.prepare('SELECT COUNT(*) as count FROM picking_history').get().count;

    console.log('📊 要清除的数据:');
    console.log(`  - 订单数: ${orderCount}`);
    console.log(`  - 订单商品数: ${orderItemCount}`);
    console.log(`  - 分销收益数: ${earningsCount}`);
    console.log(`  - 配货历史数: ${pickingHistoryCount}`);

    // 开始事务
    db.prepare('BEGIN TRANSACTION').run();

    try {
      // 清除订单商品
      const deleteOrderItems = db.prepare('DELETE FROM order_items').run();
      
      // 清除分销收益
      const deleteEarnings = db.prepare('DELETE FROM promoter_earnings').run();
      
      // 清除配货历史
      const deletePickingHistory = db.prepare('DELETE FROM picking_history').run();
      
      // 清除订单
      const deleteOrders = db.prepare('DELETE FROM orders').run();

      // 提交事务
      db.prepare('COMMIT').run();

      console.log('✅ 测试数据清除完成！');
      console.log(`  - 订单: ${deleteOrders.changes} 条`);
      console.log(`  - 订单商品: ${deleteOrderItems.changes} 条`);
      console.log(`  - 分销收益: ${deleteEarnings.changes} 条`);
      console.log(`  - 配货历史: ${deletePickingHistory.changes} 条`);

      res.json({ 
        success: true, 
        message: '测试数据清除成功',
        data: {
          deletedOrders: deleteOrders.changes,
          deletedOrderItems: deleteOrderItems.changes,
          deletedEarnings: deleteEarnings.changes,
          deletedPickingHistory: deletePickingHistory.changes
        }
      });

    } catch (error) {
      db.prepare('ROLLBACK').run();
      console.error('❌ 清除数据时出错，已回滚:', error);
      throw error;
    }

  } catch (error) {
    console.error('清除测试数据失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '清除测试数据失败: ' + error.message 
    });
  }
});

module.exports = router;
