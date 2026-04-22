const { getDb, initDatabase } = require('./src/db/sqlite');

async function checkPromoterData() {
  try {
    console.log('=== 检查推广员数据 ===');

    // 初始化数据库
    await initDatabase();
    console.log('数据库初始化完成');

    const db = getDb();

    // 检查推广员
    const promoters = db.prepare('SELECT id, username, nickname, role, promoter_code FROM users WHERE role = "promoter"').all();
    console.log('\n推广员列表:');
    if (promoters.length > 0) {
      promoters.forEach(row => {
        console.log(`  ID: ${row.id}, Username: ${row.username}, Nickname: ${row.nickname}, Promoter Code: ${row.promoter_code || '无'}`);
      });
    } else {
      console.log('  无推广员');
    }

    // 检查客户绑定关系
    const bindings = db.prepare(`
      SELECT pb.*, 
             p.username as promoter_username, 
             c.username as customer_username
      FROM promoter_bindings pb
      JOIN users p ON pb.promoter_id = p.id
      JOIN users c ON pb.customer_id = c.id
      WHERE pb.status = "active"
    `).all();
    console.log('\n客户绑定关系:');
    if (bindings.length > 0) {
      bindings.forEach(row => {
        console.log(`  ID: ${row.id}, 推广员: ${row.promoter_username}, 客户: ${row.customer_username}, 绑定时间: ${row.bind_time}`);
      });
    } else {
      console.log('  无绑定关系');
    }

    // 检查所有用户
    const users = db.prepare('SELECT id, username, nickname, role, promoter_code, parent_id FROM users').all();
    console.log('\n所有用户:');
    if (users.length > 0) {
      users.forEach(row => {
        console.log(`  ID: ${row.id}, Username: ${row.username}, Role: ${row.role}, Promoter Code: ${row.promoter_code || '无'}, Parent ID: ${row.parent_id || '无'}`);
      });
    } else {
      console.log('  无用户');
    }

    console.log('\n=== 检查完成 ===');
  } catch (error) {
    console.error('检查失败:', error);
    console.error(error.stack);
  }
}

checkPromoterData();
