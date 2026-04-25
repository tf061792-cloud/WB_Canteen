// Update admin account script
const { initDatabase, getDb, saveDb } = require('./src/db/sqlite');
const bcrypt = require('bcryptjs');

async function updateAdminAccount() {
  try {
    console.log('🔄 Initializing database...');
    const db = await initDatabase();
    console.log('✅ Database initialized successfully');

    console.log('🔍 Checking existing admin account...');
    const existingAdmin = getDb().prepare('SELECT * FROM admins WHERE username = ?').get('admin');
    
    if (existingAdmin) {
      console.log('📋 Found existing admin account:', existingAdmin.username);
      console.log('🔄 Updating admin account...');
      
      const hashedPassword = bcrypt.hashSync('647733', 10);
      const result = getDb().prepare('UPDATE admins SET username = ?, password = ? WHERE id = ?').run('adminCHJ', hashedPassword, existingAdmin.id);
      
      console.log('✅ Update result:', result);
      saveDb();
      console.log('🎉 Admin account updated successfully!');
    } else {
      console.log('⚠️  Admin account not found, creating new one...');
      
      const hashedPassword = bcrypt.hashSync('647733', 10);
      const result = getDb().prepare('INSERT INTO admins (username, password, nickname, role) VALUES (?, ?, ?, ?)').run('adminCHJ', hashedPassword, '超级管理员', 'superadmin');
      
      console.log('✅ Insert result:', result);
      saveDb();
      console.log('🎉 New admin account created successfully!');
    }

    // Verify the update
    const updatedAdmin = getDb().prepare('SELECT * FROM admins WHERE username = ?').get('adminCHJ');
    if (updatedAdmin) {
      console.log('✅ Final admin account:');
      console.log('   Username:', updatedAdmin.username);
      console.log('   Role:', updatedAdmin.role);
      console.log('   Status:', updatedAdmin.status);
    } else {
      console.log('❌ Failed to verify admin account update');
    }

  } catch (error) {
    console.error('❌ Error updating admin account:', error);
  }
}

updateAdminAccount();
