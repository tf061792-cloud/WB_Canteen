const { initDatabase, getDb } = require('./src/db/sqlite.js');

async function testOrderStatusUpdate() {
  try {
    const db = await initDatabase();
    
    // 测试订单ID
    const orderId = 12;
    
    // 检查当前订单状态
    const currentOrder = db.prepare('SELECT id, order_no, status FROM orders WHERE id = ?').get(orderId);
    console.log('Current order status:', currentOrder);
    
    // 尝试更新订单状态
    const updateResult = db.prepare(
      'UPDATE orders SET status = ? , picked_by = ? , picked_at = datetime(\'now\') , picker_remark = ? , updated_at = datetime(\'now\') WHERE id = ?'
    ).run('picked', 2, '测试配货', orderId);
    
    console.log('Update result:', updateResult);
    
    // 检查更新后的状态
    const updatedOrder = db.prepare('SELECT id, order_no, status, picked_by, picked_at FROM orders WHERE id = ?').get(orderId);
    console.log('Updated order status:', updatedOrder);
    
    // 保存数据库
    db.save();
    console.log('Database saved');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testOrderStatusUpdate();