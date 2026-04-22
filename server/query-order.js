const { initDatabase, getDb } = require('./src/db/sqlite');

async function queryOrderItems() {
  try {
    // 初始化数据库
    await initDatabase();
    
    const db = getDb();
    const orderNo = 'JD26042115020718';
    
    // 查询订单
    const order = db.prepare('SELECT id, order_no, status FROM orders WHERE order_no = ?').get(orderNo);
    
    if (order) {
      console.log('订单信息:');
      console.log(JSON.stringify(order, null, 2));
      
      // 查询订单商品
      const items = db.prepare(`
        SELECT id, product_id, product_name, name_th, picked_product_name, picked_name_th, quantity, actual_qty, price, unit
        FROM order_items 
        WHERE order_id = ?
      `).all(order.id);
      
      console.log('\n订单商品明细:');
      console.log(JSON.stringify(items, null, 2));
    } else {
      console.log('订单不存在:', orderNo);
    }
  } catch (error) {
    console.error('查询错误:', error);
  } finally {
    process.exit();
  }
}

queryOrderItems();