const { initDatabase } = require('./src/db/sqlite.js');

async function queryOrderStatus() {
  try {
    const db = await initDatabase();
    
    // 查询订单状态
    const order = db.prepare('SELECT id, order_no, status FROM orders WHERE order_no = ?').get('JD26042115020718');
    console.log('Order status:', order);
    
    // 也查询一下 order_items 表
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    console.log('Order items:', orderItems);
    
  } catch (error) {
    console.error('Error querying order:', error);
  }
}

queryOrderStatus();