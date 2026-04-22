const db = require('./src/db/sqlite').db;

console.log('=== 用户表中推广员数据 ===');
const promoters = db.prepare('SELECT id, username, nickname, role FROM users').all();
console.log('所有用户:', promoters);

console.log('\n=== 角色为 promoter 的用户 ===');
const promoterUsers = db.prepare('SELECT id, username, nickname, role FROM users WHERE role = "promoter"').all();
console.log(promoterUsers);

console.log('\n=== promoter_earnings 表数据 ===');
const earnings = db.prepare('SELECT * FROM promoter_earnings').all();
console.log('记录数:', earnings.length);
console.log(earnings);

console.log('\n=== promoter_bindings 表数据 ===');
const bindings = db.prepare('SELECT * FROM promoter_bindings').all();
console.log('记录数:', bindings.length);
console.log(bindings);

console.log('\n=== 测试推广员列表SQL ===');
const testList = db.prepare(`
  SELECT u.id, u.username, u.nickname, u.created_at,
    (SELECT COUNT(*) FROM promoter_bindings WHERE promoter_id = u.id AND status = 'active') as customer_count,
    (SELECT COALESCE(SUM(commission_amount), 0) FROM promoter_earnings WHERE promoter_id = u.id) as total_commission,
    (SELECT COALESCE(SUM(order_amount), 0) FROM promoter_earnings WHERE promoter_id = u.id) as total_sales
  FROM users u
  WHERE u.role = 'promoter'
  ORDER BY u.id DESC
`).all();
console.log(testList);