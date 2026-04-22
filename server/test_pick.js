// 测试配货状态的脚本
const { initDatabase, getDb } = require('./src/db/sqlite');

async function testPickStatus() {
  try {
    // 初始化数据库
    await initDatabase();
    const db = getDb();
    
    // 查找订单ID
    const order = db.prepare('SELECT id, order_no, status FROM orders WHERE order_no = ?').get('JD26042114472026');
    console.log('Order status:', order);
    
    if (order) {
      // 检查订单商品
      const items = db.prepare(
        'SELECT id, product_id, quantity, actual_qty, product_name, picked_product_name, picked_name_th FROM order_items WHERE order_id = ?'
      ).all(order.id);
      console.log('Order items:', items);
    }
  } catch (error) {
    console.error('测试错误:', error);
  }
}

testPickStatus();