const { initDatabase, getDb } = require('./src/db/sqlite.js');

async function checkPickInfo() {
  try {
    const db = await initDatabase();
    
    // 检查订单状态
    const order = db.prepare('SELECT id, order_no, status, picked_by, picked_at, picker_remark FROM orders WHERE order_no = ?').get('JD26042115020718');
    console.log('Order status:', order);
    
    // 检查订单商品的实际配货信息
    const orderItems = db.prepare(`
      SELECT id, product_id, product_name, name_th, quantity, actual_qty, actual_weight, picked_product_name, picked_name_th, price, unit 
      FROM order_items 
      WHERE order_id = ?
    `).all(order.id);
    
    console.log('Order items with pick info:');
    orderItems.forEach(item => {
      console.log('Item:', item);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPickInfo();