
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function checkOrders() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data/canteen.db');
  
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);
  
  console.log('=== 检查订单数据 ===');
  const orderResults = db.exec('SELECT * FROM orders');
  if (orderResults.length > 0) {
    const columns = orderResults[0].columns;
    const values = orderResults[0].values;
    console.log('订单总数:', values.length);
    values.forEach(row => {
      const order = {};
      columns.forEach((col, idx) => order[col] = row[idx]);
      console.log(`订单ID: ${order.id}, 订单号: ${order.order_no}, 状态: ${order.status}`);
    });
  }
  
  console.log('\n=== 检查订单项 ===');
  const itemResults = db.exec('SELECT * FROM order_items');
  if (itemResults.length > 0) {
    console.log('订单项总数:', itemResults[0].values.length);
  }
}

checkOrders();
