const { getDb, initDatabase } = require('./src/db/sqlite');

async function checkSystemConfig() {
  try {
    console.log('=== 检查系统配置 ===');

    // 初始化数据库
    await initDatabase();
    console.log('数据库初始化完成');

    const db = getDb();

    // 检查系统配置表
    const configs = db.prepare('SELECT * FROM system_config').all();
    console.log('\n系统配置:');
    if (configs.length > 0) {
      configs.forEach(row => {
        console.log(`  Key: ${row.config_key}, Value: ${row.config_value}`);
      });
    } else {
      console.log('  无配置数据');
    }

    // 检查是否有提成相关配置
    const commissionType = db.prepare("SELECT config_value FROM system_config WHERE config_key = 'commission_type'").get();
    const commissionRate = db.prepare("SELECT config_value FROM system_config WHERE config_key = 'commission_rate'").get();
    
    console.log('\n提成配置:');
    console.log(`  commission_type: ${commissionType ? commissionType.config_value : '未设置'}`);
    console.log(`  commission_rate: ${commissionRate ? commissionRate.config_value : '未设置'}`);

    console.log('\n=== 检查完成 ===');
  } catch (error) {
    console.error('检查失败:', error);
    console.error(error.stack);
  }
}

checkSystemConfig();
