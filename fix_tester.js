import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function fix() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    const email = 'tester@montes.digital';
    
    // 1. Update global_directory
    const [res1] = await connection.execute(
      'UPDATE global_directory SET role = ? WHERE email = ?',
      ['customer', email]
    );
    console.log(`Updated global_directory: ${res1.affectedRows} row(s)`);

    // 2. Update company_users
    const [res2] = await connection.execute(
      'UPDATE company_users SET role = ? WHERE email = ?',
      ['customer', email]
    );
    console.log(`Updated company_users: ${res2.affectedRows} row(s)`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await connection.end();
  }
}

fix();
