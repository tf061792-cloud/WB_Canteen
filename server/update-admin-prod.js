// Update admin account for production
const { initDatabase, getDb, saveDb } = require('./src/db/sqlite');
const bcrypt = require('bcryptjs');

async function updateAdminAccount() {
  try {
    console.log('🔄 Initializing database...');
    const db = await initDatabase();
    console.log('✅ Database initialized successfully');

    console.log('🔍 Checking existing admin accounts...');
    const admins = getDb().prepare('SELECT id, username, role FROM admins').all();
    console.log('📋 Current admins:', admins);

    // Check if adminCHJ already exists
    const adminCHJ = getDb().prepare('SELECT * FROM admins WHERE username = ?').get('adminCHJ');
    
    if (adminCHJ) {
      console.log('📋 adminCHJ already exists, updating password...');
      const hashedPassword = bcrypt.hashSync('647733', 10);
      const result = getDb().prepare('UPDATE admins SET password = ? WHERE username = ?').run(hashedPassword, 'adminCHJ');
      console.log('✅ Update result:', result);
    } else {
      console.log('📋 adminCHJ not found, creating new account...');
      const hashedPassword = bcrypt.hashSync('647733', 10);
      const result = getDb().prepare('INSERT INTO admins (username, password, nickname, role, status) VALUES (?, ?, ?, ?, ?)').run('adminCHJ', hashedPassword, '超级管理员', 'superadmin', 1);
      console.log('✅ Insert result:', result);
    }

    // Remove old admin account if exists
    const oldAdmin = getDb().prepare('SELECT * FROM admins WHERE username = ?').get('admin');
    if (oldAdmin) {
      console.log('🗑️ Removing old admin account...');
      const result = getDb().prepare('DELETE FROM admins WHERE username = ?').run('admin');
      console.log('✅ Delete result:', result);
    }

    saveDb();
    console.log('💾 Database saved');

    // Verify the update
    const finalAdmins = getDb().prepare('SELECT id, username, role, status FROM admins').all();
    console.log('✅ Final admins:', finalAdmins);

    console.log('🎉 Admin account update completed successfully!');

  } catch (error) {
    console.error('❌ Error updating admin account:', error);
    process.exit(1);
  }
}

updateAdminAccount();
