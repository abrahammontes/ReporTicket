import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 2
});

async function migrate() {
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM company_users LIKE 'photo'");
    if (cols.length === 0) {
      await pool.query('ALTER TABLE company_users ADD COLUMN photo LONGTEXT AFTER extension');
      console.log('Columna photo agregada a company_users.');
    } else {
      console.log('La columna photo ya existe en company_users.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
