import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function fix() {
  console.log('--- Superadmin Sync & Fix ---');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'reporticket_master'
  });

  try {
    const adminEmail = 'admin@reporticket.com';
    const adminPass = 'admin123';
    const adminId = 'super-1';

    console.log('Checking system_users...');
    const [sysUsers] = await connection.query('SELECT * FROM system_users WHERE id = ?', [adminId]);
    if (sysUsers.length === 0) {
      console.log('Creating system_user record...');
      await connection.execute(
        'INSERT INTO system_users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
        [adminId, 'Super Admin', adminEmail, adminPass, 'superadmin']
      );
    }

    console.log('Checking global_directory...');
    const [globUsers] = await connection.query('SELECT * FROM global_directory WHERE email = ?', [adminEmail]);
    if (globUsers.length === 0) {
      console.log('Creating global_directory record...');
      await connection.execute(
        'INSERT INTO global_directory (email, user_id, password, role) VALUES (?, ?, ?, ?)',
        [adminEmail, adminId, adminPass, 'superadmin']
      );
    } else {
      // Ensure password and role are correct
      await connection.execute(
        'UPDATE global_directory SET password = ?, role = ? WHERE email = ?',
        [adminPass, 'superadmin', adminEmail]
      );
    }

    console.log(`\n✅ Superadmin Synchronized!`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Pass: ${adminPass}`);
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
  } finally {
    await connection.end();
  }
}

fix();
