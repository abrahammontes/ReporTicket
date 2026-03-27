import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'reporticket_master'
  });

  try {
    const [rows] = await pool.query('DESCRIBE global_directory');
    console.log('--- SCHEMA ---');
    console.table(rows);

    const [users] = await pool.query('SELECT email, user_id, role FROM global_directory');
    console.log('\n--- USERS ---');
    console.table(users);
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

check();
