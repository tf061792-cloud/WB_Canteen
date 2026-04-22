
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function checkData() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data/canteen.db');
  
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);
  
  console.log('=== 检查用户数据 ===');
  const userResults = db.exec('SELECT * FROM users');
  if (userResults.length > 0) {
    const columns = userResults[0].columns;
    const values = userResults[0].values;
    console.log('用户总数:', values.length);
    values.forEach(row => {
      const user = {};
      columns.forEach((col, idx) => user[col] = row[idx]);
      console.log(`用户ID: ${user.id}, 用户名: ${user.username}, 昵称: ${user.nickname}`);
    });
  }
  
  console.log('\n=== 检查订单详细数据 ===');
  const orderResults = db.exec('SELECT * FROM orders');
  if (orderResults.length > 0) {
    const columns = orderResults[0].columns;
    const values = orderResults[0].values;
    console.log('订单总数:', values.length);
    values.forEach(row => {
      const order = {};
      columns.forEach((col, idx) => order[col] = row[idx]);
      console.log(`订单ID: ${order.id}, 用户ID: ${order.user_id}, 订单号: ${order.order_no}, 状态: ${order.status}`);
    });
  }
}

checkData();
