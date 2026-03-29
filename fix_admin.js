import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

async function fix() {
  console.log('--- Superadmin Sync & Fix ---');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'reporticket_master'
  });

  try {
    const adminEmail = 'abraham.montes@gmail.com';
    const adminPass = 'admin123';
    const hashedPass = await bcrypt.hash(adminPass, 10);
    const adminId = 'super-1';

    // Clean up old admin if exists
    await connection.execute("DELETE FROM system_users WHERE email = 'admin@reporticket.com'");
    await connection.execute("DELETE FROM global_directory WHERE email = 'admin@reporticket.com'");

    console.log('Checking system_users...');
    const [sysUsers] = await connection.query('SELECT * FROM system_users WHERE email = ?', [adminEmail]);
    if (sysUsers.length === 0) {
      console.log('Creating system_user record...');
      await connection.execute(
        'INSERT INTO system_users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
        [adminId, 'Super Admin', adminEmail, hashedPass, 'superadmin']
      );
    } else {
      console.log('Updating system_user record...');
      await connection.execute(
        'UPDATE system_users SET password = ?, role = ?, id = ? WHERE email = ?',
        [hashedPass, 'superadmin', adminId, adminEmail]
      );
    }

    console.log('Checking global_directory...');
    const [globUsers] = await connection.query('SELECT * FROM global_directory WHERE email = ?', [adminEmail]);
    if (globUsers.length === 0) {
      console.log('Creating global_directory record...');
      await connection.execute(
        'INSERT INTO global_directory (email, user_id, password, role) VALUES (?, ?, ?, ?)',
        [adminEmail, adminId, hashedPass, 'superadmin']
      );
    } else {
      // Ensure password and role are correct
      await connection.execute(
        'UPDATE global_directory SET password = ?, role = ? WHERE email = ?',
        [hashedPass, 'superadmin', adminEmail]
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
