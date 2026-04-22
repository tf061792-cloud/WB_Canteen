
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function checkOrderTitle() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data/canteen.db');
  
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);
  
  console.log('=== 检查 users 表结构 ===');
  const tableInfo = db.exec('PRAGMA table_info(users)');
  if (tableInfo.length > 0) {
    const columns = tableInfo[0].values;
    console.log('users 表字段:');
    columns.forEach(col => {
      console.log(`  - ${col[1]} (${col[2]})`);
    });
  }
  
  console.log('\n=== 检查用户数据 ===');
  const userResults = db.exec('SELECT id, username, nickname, order_title FROM users LIMIT 10');
  if (userResults.length > 0) {
    const userColumns = userResults[0].columns;
    const userValues = userResults[0].values;
    console.log('用户列表:');
    userValues.forEach(row => {
      const user = {};
      userColumns.forEach((col, idx) => user[col] = row[idx]);
      console.log(`  ID:${user.id}, 用户名:${user.username}, 昵称:${user.nickname}, 订单抬头:${user.order_title || '(空)'}`);
    });
  }
}

checkOrderTitle();
